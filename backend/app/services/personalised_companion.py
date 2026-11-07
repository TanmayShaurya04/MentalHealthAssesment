"""
Personalised companion replies.

`build_user_context` gathers a small, privacy-safe summary of the signed-in student
(first name, recent mood scores and tags, latest screening band, next appointment).
Journal TEXT is never read; only mood levels and tags are used.

`compose_reply` is the offline engine: it recognises what the student is talking about,
reflects their own words back, links it to their data when relevant, offers one small
step, and asks one question. `context_as_prompt` gives the same facts to an LLM.
"""
import datetime
import hashlib
import re
from typing import Any, Dict, List, Optional

from app.database import db_manager

_ALLOWED_TAGS = {"Exams", "Deadlines", "Sleep", "Friends", "Family", "Rest", "Exercise", "Burnout"}


# ── Context ───────────────────────────────────────────────────────────────
async def build_user_context(user: dict, user_id: str) -> Dict[str, Any]:
    ctx: Dict[str, Any] = {"first_name": (user.get("name") or "").split(" ")[0] or None}

    moods = await db_manager.get_collection("moods").find({"user_id": user_id}).sort("recorded_at", -1).limit(7).to_list(length=7)
    if moods:
        scores = [int(m.get("score", 3)) for m in moods]            # newest first
        ctx["mood_scores"] = scores[::-1]                             # oldest first
        ctx["mood_latest"] = scores[0]
        ctx["mood_avg"] = round(sum(scores) / len(scores), 1)
        if len(scores) >= 3:
            recent, earlier = sum(scores[:3]) / 3, sum(scores[3:]) / max(1, len(scores[3:])) if len(scores) > 3 else None
            if earlier is not None:
                ctx["mood_trend"] = "down" if recent <= earlier - 0.7 else "up" if recent >= earlier + 0.7 else "steady"
            elif all(s <= 2 for s in scores[:3]):
                ctx["mood_trend"] = "low"
        tags: List[str] = []
        for m in moods:
            tags += [t for t in m.get("tags", []) if t in _ALLOWED_TAGS]
        if tags:
            ctx["mood_tags"] = sorted(set(tags), key=lambda t: -tags.count(t))[:3]

    last = await db_manager.get_collection("assessments").find({"user_id": user_id}).sort("taken_at", -1).limit(1).to_list(length=1)
    if last:
        a = last[0]
        ctx["screening_category"] = a.get("category")
        ctx["screening_days_ago"] = _days_since(a.get("taken_at"))
        ctx["screening_sections"] = {s.get("instrument"): s.get("severity") for s in a.get("sections", []) if s.get("validated")}

    appts = await db_manager.get_collection("appointments").find({"user_id": user_id}).to_list(length=50)
    today = datetime.date.today().isoformat()
    upcoming = sorted((a for a in appts if a.get("status") in ("pending", "confirmed") and a.get("preferred_date", "") >= today),
                      key=lambda a: a.get("preferred_date", ""))
    if upcoming:
        ctx["next_appointment"] = {"date": upcoming[0]["preferred_date"], "status": upcoming[0]["status"]}
    return ctx


def _days_since(iso: Optional[str]) -> Optional[int]:
    try:
        return (datetime.datetime.now(datetime.timezone.utc) - datetime.datetime.fromisoformat(iso)).days
    except Exception:  # noqa: BLE001
        return None


def context_as_prompt(ctx: Dict[str, Any]) -> str:
    parts = []
    if ctx.get("first_name"):
        parts.append(f"The student's first name is {ctx['first_name']}.")
    if "mood_scores" in ctx:
        parts.append(f"Recent mood scores (1-5, oldest to newest): {ctx['mood_scores']}; trend: {ctx.get('mood_trend', 'unknown')}.")
    if ctx.get("mood_tags"):
        parts.append("Themes they tagged on mood logs: " + ", ".join(ctx["mood_tags"]) + ".")
    if ctx.get("screening_category"):
        parts.append(f"Their latest optional screening band was '{ctx['screening_category']}' ({ctx.get('screening_days_ago')} days ago). This is not a diagnosis.")
    if ctx.get("next_appointment"):
        parts.append(f"They have a counselling request for {ctx['next_appointment']['date']} ({ctx['next_appointment']['status']}).")
    return " ".join(parts)


# ── Intent detection ──────────────────────────────────────────────────────
INTENTS = [
    ("greeting", r"^\s*(hi|hello|hey|namaste|good (morning|evening|afternoon))\b"),
    ("exams", r"\b(exam|exams|test|viva|finals|backlog|marks|grades?|cgpa|gpa|result|revision|syllabus)\b|padhai"),
    ("deadlines", r"\b(deadline|assignment|submission|project|thesis|due)\b|procrastinat"),
    ("placement", r"\b(placement|interview|internship|career|job|resume|offer)\b"),
    ("sleep", r"\b(sleep|insomnia|awake|nightmare|tired|exhausted|fatigue)\b|neend|thak"),
    ("anxiety", r"\b(anxious|anxiety|panic|nervous|overthink\w*|worried|worry|scared|racing|heart(beat)?)\b|ghabra"),
    ("lonely", r"\b(lonely|alone|isolated|no friends|left out|homesick|miss home)\b|akela"),
    ("relationship", r"\b(breakup|broke up|girlfriend|boyfriend|partner|relationship|roommate|fight|argument)\b"),
    ("family", r"\b(parents?|family|mom|dad|expectations?|pressure from home)\b"),
    ("lowmood", r"\b(sad|depress\w*|hopeless|empty|numb|worthless|failure|crying|cry|unmotivated|no motivation|down)\b|udaas|dukhi"),
    ("anger", r"\b(angry|furious|irritated|irritable|frustrated|annoyed)\b"),
    ("overwhelm", r"\b(overwhelm\w*|too much|burn(ed|t)? ?out|can't cope|cannot cope|drowning)\b"),
    ("gratitude", r"\b(better|good day|happy|thank(s| you)|grateful|proud|relieved)\b"),
    ("exercise", r"\b(breathing|exercise|technique|calm me|relax|ground(ing)?|help me calm)\b"),
    ("counsellor", r"\b(counsell?or|therapist|professional help|talk to someone)\b"),
]
_COMPILED = [(n, re.compile(p, re.I)) for n, p in INTENTS]


def detect_intents(text: str) -> List[str]:
    return [n for n, rx in _COMPILED if rx.search(text)]


def _pick(options: List[str], seed: str) -> str:
    return options[int(hashlib.md5(seed.encode()).hexdigest(), 16) % len(options)]


def _echo(text: str) -> str:
    """A short quote of what they said, for reflecting back."""
    t = re.sub(r"\s+", " ", text.strip())
    first = re.split(r"[.!?\n]", t)[0].strip()
    first = first[:90].rstrip(",; ")
    return first


# ── Pieces ────────────────────────────────────────────────────────────────
VALIDATE = {
    "exams": ["Exam pressure can make everything feel like it's riding on one paper.", "It makes sense that exams feel heavy; they carry a lot of meaning for you."],
    "deadlines": ["A pile of deadlines can freeze even a capable person.", "When everything is due at once, the hardest part is usually deciding where to start."],
    "placement": ["Placement season quietly raises the stakes on everything.", "Waiting on interviews and offers is draining, and it's easy to compare yourself with others."],
    "sleep": ["Poor sleep makes every other worry louder.", "When you're short on rest, small problems start to look big."],
    "anxiety": ["That wound-up, racing feeling is exhausting.", "Anxiety can make your mind run ahead of what is actually happening."],
    "lonely": ["Feeling alone in a crowded campus is more common than people admit, and it still hurts.", "Missing connection is a real need, not a weakness."],
    "relationship": ["Relationship stress follows you into everything else.", "Conflict with people close to you can hurt more than any exam."],
    "family": ["Carrying family expectations while building your own path is a lot.", "It's hard when the people you love also feel like pressure."],
    "lowmood": ["I'm sorry it feels this heavy right now.", "Thank you for putting that into words; it isn't easy."],
    "anger": ["Irritation often sits on top of being tired or stretched thin.", "It's okay to be frustrated; it usually points to something that matters."],
    "overwhelm": ["That sounds like too many things at once.", "Feeling overwhelmed is a sign your load is heavy, not that you're failing."],
    "gratitude": ["I'm really glad to hear that.", "That's lovely to hear; those moments matter."],
    "greeting": ["Hi, I'm glad you're here.", "Hello. It's good to see you."],
    "exercise": ["Happy to help with that.", "Let's slow things down together."],
    "counsellor": ["Wanting to talk to someone is a strong, sensible step."],
}

STEPS = {
    "exams": ["Try a 25-minute block on just ONE topic, then a 5-minute break. Write down the single topic before you begin.", "Pick the smallest chapter you've been avoiding and read only its headings for 10 minutes. Starting is the hard part."],
    "deadlines": ["List the deadlines, then circle only the one due first. Work on it for 20 minutes with your phone out of reach.", "Break the next task into a 'first 10 minutes' version, such as opening the file and writing the outline."],
    "placement": ["Spend 15 minutes on one concrete thing today (one resume line or one practice question) and then stop.", "Write two lines about what you control this week and what you don't; it quiets the guessing."],
    "sleep": ["Tonight, try a 20-minute wind-down: screens off, dim light, and slow breathing (in for 4, out for 6).", "Keep wake-up time steady tomorrow even if you slept badly; it's the quickest way to reset the rhythm."],
    "anxiety": ["Try box breathing: in 4, hold 4, out 4, hold 4, for four rounds. Or name 5 things you see, 4 you can touch, 3 you hear.", "Put the worry on paper as one sentence: 'I'm worried that...'. Then write one thing that is true right now."],
    "lonely": ["Send one low-pressure message today, like 'chai after class?' to someone you already know a little.", "Visit one club or study group once, just to watch. You don't have to talk."],
    "relationship": ["Before replying to them, write the message you want to send and wait 20 minutes. Then keep only what you'd still say calmly.", "Name what you need (space, an apology, to be heard); it makes the next conversation simpler."],
    "family": ["Try one sentence you could say to them: 'I'm working hard, and what helps most is...'.", "Write down what *you* want from this year, separate from what others expect."],
    "lowmood": ["Choose one tiny thing: water, a short walk, or sunlight for five minutes. Small body steps help when the mind is heavy.", "Message one person with 'rough day, can we talk?'. You don't need to explain everything."],
    "anger": ["Take 6 slow breaths with a longer exhale, or walk for 5 minutes before you respond to anyone.", "Write the angry version in your notes app and don't send it. Then write what you actually need."],
    "overwhelm": ["Take a blank page: write everything on your mind, then pick just the top 1 and do the first 10 minutes of it.", "Pause for 2 minutes of slow breathing, then decide what can wait until tomorrow."],
    "gratitude": ["Note what helped today in one line, so you can find your way back to it on harder days.", "Share it with someone; good moments grow when they're told."],
    "greeting": [],
    "exercise": ["Box breathing: in for 4, hold for 4, out for 4, hold for 4. Repeat four times and let your shoulders drop.", "5-4-3-2-1 grounding: 5 things you see, 4 you feel, 3 you hear, 2 you smell, 1 you taste."],
    "counsellor": ["You can book a confidential session from the Counsellors page. Pick a time that suits you; the counsellor confirms it."],
}

QUESTIONS = {
    "exams": ["Which exam feels the heaviest right now?", "What's the part that worries you most: the syllabus, the time, or the result?"],
    "deadlines": ["Which one is due first?", "What's making the first step feel so hard?"],
    "placement": ["What's the hardest part this week: waiting, preparing, or comparing?", "What would feel like progress by Friday?"],
    "sleep": ["What time did you last fall asleep properly, and what's keeping your mind busy at night?", "Is it falling asleep, staying asleep, or waking up too early?"],
    "anxiety": ["When did the feeling start today?", "What's the thought that keeps coming back?"],
    "lonely": ["When during the day does it feel strongest?", "Is there anyone you used to feel comfortable with?"],
    "relationship": ["What do you most wish the other person understood?", "How are you taking care of yourself while this is going on?"],
    "family": ["What do you wish they knew about how this feels?", "Is there one person in the family who tends to listen?"],
    "lowmood": ["How long has it felt like this?", "Is there anything that has made today a little easier, even slightly?"],
    "anger": ["What was the moment it started?", "What do you need most right now: space, to vent, or a plan?"],
    "overwhelm": ["If you could remove just one thing from your plate, what would it be?", "What is the very next thing on the list?"],
    "gratitude": ["What made the difference today?", "What would you like more of?"],
    "greeting": ["How are you feeling right now, in a few words?", "What's on your mind today?"],
    "exercise": ["How do you feel after doing it?", "Would you like another short exercise?"],
    "counsellor": ["Is there something specific you'd like to bring to the session?"],
}

GENERIC = [
    "I'm listening. Tell me a little more about what's been on your mind?",
    "That sounds like it matters to you. What part of it feels most important right now?",
    "Thanks for sharing that. What would feel like a small relief today?",
]


def _data_link(ctx: Dict[str, Any], intents: List[str], seed: str) -> Optional[str]:
    """One sentence that connects the conversation to the student's own data, only when it is relevant."""
    trend, scores = ctx.get("mood_trend"), ctx.get("mood_scores")
    if trend in ("down", "low") and any(i in intents for i in ("lowmood", "overwhelm", "sleep", "anxiety", "exams", "lonely")):
        return "I noticed your mood check-ins have dipped over the last few days, so this fits. You're not imagining it."
    if trend == "up" and any(i in intents for i in ("gratitude", "lowmood")):
        return "Your recent check-ins have been trending up, which is worth noticing."
    tags = ctx.get("mood_tags") or []
    mapping = {"exams": "Exams", "deadlines": "Deadlines", "sleep": "Sleep", "family": "Family", "lonely": "Friends"}
    for i in intents:
        if mapping.get(i) in tags:
            return f"You've tagged '{mapping[i]}' on your mood logs recently, so this isn't new. It's been with you for a while."
    cat, days = ctx.get("screening_category"), ctx.get("screening_days_ago")
    if cat in ("moderate", "elevated") and days is not None and days <= 21 and any(i in intents for i in ("lowmood", "anxiety", "overwhelm", "sleep")):
        return "Your screening a little while ago also showed that you've been carrying quite a bit. Talking with a counsellor could really help."
    appt = ctx.get("next_appointment")
    if appt and any(i in intents for i in ("lowmood", "anxiety", "overwhelm", "counsellor")):
        word = "confirmed" if appt["status"] == "confirmed" else "requested"
        return f"You have a counselling session {word} for {appt['date']}; it can help to jot down what you'd like to say there."
    return None


def compose_reply(user_message: str, history: List[Dict[str, str]], ctx: Dict[str, Any]) -> str:
    intents = detect_intents(user_message)
    name = ctx.get("first_name")
    turn = sum(1 for m in history if m.get("role") == "assistant")
    seed = f"{user_message}|{turn}"
    prev_assistant = " ".join(m["content"] for m in history if m.get("role") == "assistant")

    primary = next((i for i in intents if i != "greeting"), intents[0] if intents else None)
    lines: List[str] = []

    if primary == "greeting" or (turn == 0 and name and primary in (None, "greeting")):
        lines.append(f"Hi {name}, I'm glad you're here." if name else _pick(VALIDATE["greeting"], seed))
    elif primary:
        lines.append(_pick(VALIDATE[primary], seed))
        quote = _echo(user_message)
        if len(quote) > 12 and primary != "exercise":
            lines.append(f"You said \"{quote}\", and that's worth taking seriously.")
    else:
        lines.append(_pick(GENERIC, seed))
        if name and turn == 0:
            lines[0] = f"Thanks for telling me, {name}. " + lines[0]

    link = _data_link(ctx, intents, seed) if primary else None
    if link and link not in prev_assistant:
        lines.append(link)

    if primary and STEPS.get(primary):
        pool = [s for s in STEPS[primary] if s not in prev_assistant] or STEPS[primary]
        lines.append("One small thing you could try: " + _pick(pool, seed))
    if "counsellor" not in intents and ctx.get("screening_category") in ("moderate", "elevated") and turn >= 2 and primary in ("lowmood", "anxiety", "overwhelm"):
        lines.append("If this keeps weighing on you, the Counsellors page lets you book a confidential session.")

    if primary and QUESTIONS.get(primary):
        pool = [q for q in QUESTIONS[primary] if q not in prev_assistant] or QUESTIONS[primary]
        lines.append(_pick(pool, seed + "q"))
    elif not primary:
        lines.append("")

    return "\n\n".join(l for l in lines if l)
