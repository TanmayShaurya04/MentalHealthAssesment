import re
from typing import Tuple, Dict, Any

# Crisis keywords & phrases (deterministic pre-screening)
CRISIS_PATTERNS = [
    r"\b(suicide|suicidal|kill myself|want to die|end my life|end it all)\b",
    r"\b(hang myself|cut myself|slit my wrist|self harm|self-harm|hurting myself)\b",
    r"\b(take all my pills|overdose|jump off|jump from|not want to live)\b",
    r"\b(goodbye cruel world|better off dead|no reason to live)\b",
]

# Hinglish / romanised Hindi phrases (spelling varies a lot, so these are deliberately loose)
CRISIS_PATTERNS += [
    r"\b(mar jana chahta|mar jana chahti|marna chahta|marna chahti|mar jaana chahta|mar jaana chahti)\b",
    r"\b(jeena nahi chahta|jeena nahi chahti|jina nahi chahta|jina nahi chahti|jeene ka mann nahi)\b",
    r"\b(khudkushi|khud kushi|suicide kar|apni jaan le|jaan dena chahta|jaan dena chahti)\b",
    r"\b(zindagi khatam|sab khatam kar)\b",
    r"\b(wish i (was|were) dead|don'?t want to be alive|do not want to be alive|can'?t go on living)\b",
    r"\b(end it all|take my own life|kill me|rather be dead)\b",
]

CRISIS_COMPILED = [re.compile(p, re.IGNORECASE) for p in CRISIS_PATTERNS]

CRISIS_RESPONSE_CONTENT = (
    "I'm hearing how much pain and weight you're carrying right now, and I want you to know that you don't have to navigate this alone.\n\n"
    "Because your safety and life matter deeply, please connect directly with people who are trained to support you through this exact moment. These free, confidential resources are available right now:\n\n"
    "• **Tele-MANAS (Govt. of India)**: Dial `14416` or `1800-891-4416` (24x7, Toll-Free, Multiple Languages)\n"
    "• **KIRAN Mental Health Helpline**: Dial `1800-599-0019` (24x7, Toll-Free)\n"
    "• **iCall Psychosocial Helpline**: Call `9152987821` (Mon–Sat, 10 AM – 8 PM)\n"
    "• **Vandrevala Foundation**: Call `9999 666 555` or WhatsApp available (24x7)\n"
    "• **Emergency Services**: Dial `112` or visit your campus health clinic immediately.\n\n"
    "Please consider reaching out to a friend, family member, or university counsellor today. You deserve care, understanding, and support."
)

def check_message_safety(text: str) -> Tuple[bool, str]:
    """
    Evaluates student message text for crisis or self-harm indicators.
    Returns (is_flagged: bool, response_content: str).
    """
    clean_text = text.strip()
    for pattern in CRISIS_COMPILED:
        if pattern.search(clean_text):
            return True, CRISIS_RESPONSE_CONTENT
    return False, ""


# ── Check what the AI model says before the student sees it ───────────────────
UNSAFE_REPLY_PATTERNS = [
    re.compile(r"\b(take|taking|swallow|swallowing)\s+\d+\s*(mg|milligrams?|pills?|tablets?|capsules?)\b", re.IGNORECASE),
    re.compile(r"\b(stop|stopping|quit|quitting)\s+(taking\s+)?(your|the)\s+(medication|medicine|antidepressants?|meds)\b", re.IGNORECASE),
    re.compile(r"\b(i|we)\s+(can\s+)?diagnos(e|ed)\b|\byou\s+(definitely\s+|probably\s+)?have\s+(clinical\s+)?(depression|bipolar|schizophrenia|an?\s+anxiety\s+disorder|ptsd|adhd)\b", re.IGNORECASE),
    re.compile(r"\b(you\s+should|you\s+could|try)\s+(hurting|harming|cutting)\b", re.IGNORECASE),
]

SAFE_FALLBACK_REPLY = (
    "I want to be careful here: I can listen and offer coping ideas, but I can't give medical advice, "
    "diagnoses or advice about medication. A doctor or counsellor is the right person for that, and you can "
    "book one from the Counsellors page.\n\n"
    "In the meantime, I'm happy to keep talking about what you're feeling, or walk you through a short "
    "breathing exercise."
)


def check_ai_reply_safety(reply: str) -> Tuple[bool, str]:
    """Returns (was_unsafe, text_to_show). Unsafe model output is replaced by a safe fallback."""
    for pattern in UNSAFE_REPLY_PATTERNS:
        if pattern.search(reply or ""):
            return True, SAFE_FALLBACK_REPLY
    return False, reply
