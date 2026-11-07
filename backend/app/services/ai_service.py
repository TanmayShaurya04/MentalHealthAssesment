import re
import random
import httpx
from typing import List, Dict, Any
from app.config import settings

SYSTEM_PROMPT = """You are Serenova, an empathetic, non-diagnostic digital mental well-being companion for university and college students.

Your role and core rules:
1. Tone: Warm, grounded, attentive, and calm. Speak like a thoughtful, supportive peer or mentor.
2. Boundaries: You are strictly a support companion. You CANNOT diagnose psychological conditions, prescribe medications, or replace certified mental health professionals, counsellors, or medical doctors.
3. Active reflection: Listen closely to what the student shares. Acknowledge their feelings before offering gentle reframing or grounding ideas.
4. Keep responses concise, clear, and easy to read (1 to 3 short paragraphs). Avoid overwhelming walls of text or bullet-point overloads.
5. If the student discusses academic pressure, exam anxiety, sleep problems, loneliness, or burnout, normalize their struggle while offering small, actionable coping steps.
6. Remember: This is a safe, reflective space."""


# ============================================================================
# COMPREHENSIVE RULE-BASED PSYCHOLOGICAL COMPANION ENGINE
# ============================================================================

class RuleBasedCompanionEngine:
    """
    Intelligent rule-based mental health support chatbot.
    Analyzes student messages for emotional tone, cognitive distress patterns,
    academic pressures, and specific well-being inquiries.
    """

    def __init__(self):
        # Conversation state tracking
        self._history_counter = 0

        # Topic rules with trigger patterns and empathetic responses
        self.rules: List[Dict[str, Any]] = [
            # 1. Greetings & Check-ins
            {
                "topic": "greeting",
                "patterns": [
                    r"\b(hi|hello|hey|heya|howdy|good morning|good afternoon|good evening|sup|yo)\b",
                    r"\b(how are you|how're you|who are you|what can you do)\b"
                ],
                "responses": [
                    (
                        "Hello! I'm Serenova, your private mental well-being companion.\n\n"
                        "Whether you're feeling weighed down by classes, navigating student life, or simply needing a quiet place to unload your thoughts without judgment, I'm right here with you.\n\n"
                        "How is your mind feeling in this exact moment?"
                    ),
                    (
                        "Hey there, welcome. I'm glad you took a moment out of your day to pause and check in.\n\n"
                        "University life moves fast, and it's rare that we give ourselves permission to just stop and reflect. What's been occupying the most space in your thoughts today?"
                    ),
                    (
                        "Hi! It's good to meet you. You can think of this as a completely safe, confidential decompression space.\n\n"
                        "Whatever you're carrying today—big or small—you don't have to carry it in silence. What would feel most helpful to talk through right now?"
                    )
                ]
            },

            # 2. Breathing & Grounding Exercises
            {
                "topic": "grounding_breathing",
                "patterns": [
                    r"\b(breathe|breathing|grounding|panic attack|calm me down|calm down|racing heart|help me relax|meditation|ground me)\b",
                    r"\b(2-minute|guided breath|hyperventilating|dizzy with anxiety)\b"
                ],
                "responses": [
                    (
                        "Let's slow things down together right now. You are safe in this physical space.\n\n"
                        "**Box Breathing (4-4-4-4):**\n"
                        "1. **Inhale slowly** through your nose for **4 seconds**...\n"
                        "2. **Hold** that gentle breath for **4 seconds**...\n"
                        "3. **Exhale smoothly** through your mouth for **4 seconds**...\n"
                        "4. **Rest empty** for **4 seconds**.\n\n"
                        "Repeat this 3 times. Feel your shoulders dropping away from your ears. Take your time—how does your body feel now?"
                    ),
                    (
                        "When overwhelming thoughts spin, returning to your physical senses is the most immediate anchor.\n\n"
                        "**The 5-4-3-2-1 Grounding Method:**\n"
                        "• **5 things** you can see around your room right now\n"
                        "• **4 things** you can physically touch (the chair beneath you, your desk)\n"
                        "• **3 sounds** you can faintly hear right now\n"
                        "• **2 scents** in the air\n"
                        "• **1 deep, conscious breath** through your belly\n\n"
                        "Notice that you are here, in the present room, grounded. What is one object you noticed around you?"
                    )
                ]
            },

            # 3. Academic Pressure, Exams & Deadlines
            {
                "topic": "academic_stress",
                "patterns": [
                    r"\b(exam|exams|finals|midterm|test|deadline|deadlines|assignment|assignments|study|studying|gpa|grades|syllabus|coursework|flunk|fail|failing|lecture|padhai|padh|marks|tension|paper)\b",
                    r"\b(too much to study|submission|backlog|attendance|viva|darr lag raha hai|kuch samajh nahi aa raha)\b"
                ],
                "responses": [
                    (
                        "Academic deadlines have a way of feeling like an avalanche where everything demands your focus at the exact same time. "
                        "First, take a gentle breath: **Your worth as a human being is not measured by your grades or your daily productivity.**\n\n"
                        "When everything feels urgent, our brain freezes. Let's do a micro-triage: What is the single smallest assignment or slide deck you could look at for just **15 minutes** today? You don't have to finish it—just take that first step."
                    ),
                    (
                        "Exam anxiety often whispers that if you don't perform perfectly, everything falls apart. That's a cognitive distortion, not a reality.\n\n"
                        "Your mind absorbs information far better when it feels regulated rather than panicked. Have you had a sip of water or stepped away from your desk in the last two hours? Sometimes giving yourself a 10-minute break actually speeds up your learning."
                    ),
                    (
                        "It sounds like you're carrying a heavy academic load right now. Remember the rule of **'Non-Zero Days'**—on days when you have 10% capacity, giving 10% is 100% of what was possible.\n\n"
                        "Which specific subject or project is triggering the most dread right now? Let's break it down together."
                    )
                ]
            },

            # 4. Burnout & Exhaustion
            {
                "topic": "burnout_exhaustion",
                "patterns": [
                    r"\b(burnout|burned out|burnt out|exhausted|exhaustion|no energy|drained|depleted|tired of everything|mentally tired|brain fog|can't keep doing this|thak gaya|thak gayi|kuch nahi ho raha)\b",
                    r"\b(running on empty|overworked|overwhelmed|too tired)\b"
                ],
                "responses": [
                    (
                        "Burnout isn't a sign that you're weak; it's a physiological signal that you have been strong for too long without replenishment.\n\n"
                        "When you're at this stage of depletion, pushing harder only deepens the fog. What you need right now is not more discipline—it's genuine, guilt-free rest.\n\n"
                        "Can you look at your schedule today and identify just one obligation you can pause, postpone, or simplify?"
                    ),
                    (
                        "When emotional and mental energy runs dry, even basic tasks like opening a notebook or replying to a text message feel like climbing a mountain.\n\n"
                        "Acknowledge that fatigue without judging yourself for it. Your body is asking for care. What is something small that usually brings you comfort—a warm shower, lying down in quiet, or listening to music?"
                    )
                ]
            },

            # 5. Sleep & Insomnia
            {
                "topic": "sleep_issues",
                "patterns": [
                    r"\b(sleep|insomnia|can't sleep|cannot sleep|trouble sleeping|sleepless|waking up|nightmare|nightmares|stayed up late|all nighter|sleep schedule|neend|so nahi pa raha|so nahi pa rahi)\b",
                    r"\b(restless night|tossing and turning)\b"
                ],
                "responses": [
                    (
                        "Sleep difficulties and university stress are deeply intertwined. When your mind has been running at high alert all day, it doesn't know how to simply 'switch off' when your head hits the pillow.\n\n"
                        "A gentle practice: If you've been tossing and turning for more than 20 minutes, don't force it. Sit in dim light, read something non-stimulating or listen to soft ambient sounds until drowsiness naturally visits.\n\n"
                        "Have late-night screens or caffeine been part of your evening routine lately?"
                    ),
                    (
                        "Tossing and turning in the quiet of the night can make worries feel twice as loud and twice as scary.\n\n"
                        "Try a 'Brain Dump' on paper before lying down—write down everything your brain is trying to hold onto so your mind knows it won't be forgotten by tomorrow.\n\n"
                        "What thoughts usually keep you awake the most?"
                    )
                ]
            },

            # 6. Loneliness & Social Isolation
            {
                "topic": "loneliness",
                "patterns": [
                    r"\b(lonely|loneliness|alone|isolated|isolation|no friends|don't fit in|nobody cares|no one to talk to|disconnected|left out|homesick|homesickness|akela|akeli|akelapan|ghar ki yaad)\b",
                    r"\b(miss my family|miss home|everyone has friends except me)\b"
                ],
                "responses": [
                    (
                        "University campuses can be the loneliest places in the world, even when surrounded by hundreds of students. "
                        "It is easy to look around and assume everyone else has found their lifelong group, but so many students feel that exact same silent disconnection.\n\n"
                        "Feeling isolated does not mean you are unlovable or awkward. Finding your rhythm in a new community takes time. Would it feel manageable to send a low-pressure text to an old friend, or study in a shared campus café just to be near gentle background life?"
                    ),
                    (
                        "Missing the familiarity of home and feeling like an outsider in college is completely normal, especially during semester transitions.\n\n"
                        "Your feelings are valid. You don't have to force yourself to be an extrovert. Even tiny connections—smiling at a classmate, saying thanks to a librarian—remind us of human warmth. What part of home or friendship do you miss the most right now?"
                    )
                ]
            },

            # 7. Anxiety, Panic & Overthinking
            {
                "topic": "anxiety_overthinking",
                "patterns": [
                    r"\b(anxiety|anxious|overthinking|panic|panicking|worried|worrying|nervous|nervousness|racing thoughts|what if|impending doom|scared|dread|darr|ghabrahat|bechaini)\b",
                    r"\b(spiraling|heart pounding|can't breathe properly)\b"
                ],
                "responses": [
                    (
                        "Anxiety is your nervous system's alarm bell firing in response to perceived threats. It feels intense and physical, but remember: **An anxious thought is an event in your mind, not a proven fact about the future.**\n\n"
                        "Put both feet firmly flat on the floor. Feel the contact with the ground. Drop your jaw, unclench your fists, and take a long, slow sigh out.\n\n"
                        "What is the specific 'what if' scenario that is looping in your mind right now?"
                    ),
                    (
                        "When overthinking takes over, our minds try to solve problems that haven't even happened yet. It's exhausting.\n\n"
                        "Ask yourself: *'Can I take action on this in the next 15 minutes?'* If yes, take one micro-step. If no, gently tell your mind: *'I hear you, but this cannot be resolved right now.'*\n\n"
                        "I'm here with you. Take your time."
                    )
                ]
            },

            # 8. Depression, Sadness & Emptiness
            {
                "topic": "sadness_depression",
                "patterns": [
                    r"\b(depressed|depression|sad|sadness|crying|unhappy|empty|numb|numbness|hopeless|heavy heart|miserable|down in the dumps|gloom)\b",
                    r"\b(don't feel like doing anything|pointless|why bother)\b"
                ],
                "responses": [
                    (
                        "I hear how heavy things feel right now. It takes courage to put into words when you're feeling low, empty, or disconnected from joy.\n\n"
                        "Please remember that having days where everything feels grey does not mean your life will always feel this way. Emotional seasons shift, even when it feels impossible in the thick of it.\n\n"
                        "You don't have to put on a brave face here. Have you been able to eat a meal or drink some water today? Sometimes meeting basic physical needs is the gentlest first step."
                    ),
                    (
                        "Thank you for sharing this with me. When sadness or numbness lingers, just getting through the day is a quiet victory that deserves acknowledgment.\n\n"
                        "Be very patient with yourself right now. If getting out of bed or attending class feels too steep today, what is the simplest, kindest thing you could do for yourself in the next hour?"
                    )
                ]
            },

            # 9. Imposter Syndrome & Self-Worth
            {
                "topic": "imposter_syndrome",
                "patterns": [
                    r"\b(imposter|imposter syndrome|not good enough|inadequate|failure|i'm a failure|worthless|stupid|dumb|inferior|everyone is smarter|behind everyone)\b",
                    r"\b(don't deserve to be here|fake it till you make it|fraud)\b"
                ],
                "responses": [
                    (
                        "What you're describing is the classic 'Imposter Phenomenon'—and ironically, it almost exclusively affects conscientious, capable students who care deeply about their work.\n\n"
                        "You compare your internal doubts with everyone else's polished external highlights. But you didn't get here by accident. You were admitted, you passed your prerequisites, and you earned your seat.\n\n"
                        "What specifically triggered this feeling of falling behind today? Was it a peer, an exam result, or a lecture?"
                    ),
                    (
                        "The voice that tells you that you are a failure is a critic, not a truth-teller. Everyone around you in that lecture hall has moments where they feel completely lost and terrified of being found out.\n\n"
                        "Try to speak to yourself today the way you would speak to a friend who came to you with this exact doubt. You would never tell them they don't deserve to be here. Give yourself that same grace."
                    )
                ]
            },

            # 10. Procrastination & Motivation
            {
                "topic": "procrastination",
                "patterns": [
                    r"\b(procrastinat|procrastination|procrastinating|lazy|no motivation|lack of motivation|can't focus|distracted|wasting time|scrolling on phone|doomscrolling)\b",
                    r"\b(putting off|avoiding work|can't get started)\b"
                ],
                "responses": [
                    (
                        "Procrastination is rarely about laziness—psychologically, it is an emotional regulation issue. We avoid tasks because they bring up underlying anxiety: fear of failure, fear of imperfection, or sheer cognitive overwhelm.\n\n"
                        "Let's lower the bar to something ridiculously small. Try the **'5-Minute Rule'**: Commit to working on your task for just 5 minutes. If you want to stop after 5 minutes, you have full permission to stop. 80% of the time, overcoming the friction of starting is all it takes.\n\n"
                        "What is the first sentence or first file you need to open?"
                    ),
                    (
                        "When your brain seeks cheap dopamine (like scrolling on your phone), it's often trying to escape the dread associated with a big task.\n\n"
                        "Don't beat yourself up for the hours you lost earlier today; guilt only fuels more procrastination. The clock resets right now. What is one tiny 2-minute task you can do before getting into deep work?"
                    )
                ]
            },

            # 11. Career & Future Uncertainty
            {
                "topic": "career_future",
                "patterns": [
                    r"\b(career|placement|placements|internship|internships|job|jobs|future|resume|interview|unemployed|unemployment|what am i doing with my life)\b",
                    r"\b(future anxiety|no idea what to do|after graduation)\b"
                ],
                "responses": [
                    (
                        "Future and placement anxiety is one of the heaviest burdens university students shoulder. Society pressures us to have our entire next decade planned out by our early twenties.\n\n"
                        "The truth that few people admit: Most successful, fulfilled professionals took winding, unpredictable paths. You do not need to figure out your entire career today; you only need to figure out your next small experiment.\n\n"
                        "What is one skill or interest you genuinely enjoy, regardless of resume buzzwords?"
                    ),
                    (
                        "Rejection letters, resume screenings, and competitive peer chatter can make you feel like the doors are closing. But your career is a marathon, not a sprint determined by campus placement week.\n\n"
                        "Protect your mental energy. Are you preparing for a specific interview or test right now?"
                    )
                ]
            },

            # 12. Relationships, Breakups & Family Conflict
            {
                "topic": "relationships",
                "patterns": [
                    r"\b(relationship|relationships|boyfriend|girlfriend|partner|breakup|broken heart|heartbroken|ex|dumped|dating|roommate|roommates|parents|mom|dad|family pressure)\b",
                    r"\b(fight with friend|argument|betrayal|toxic friend)\b"
                ],
                "responses": [
                    (
                        "Relational conflict and heartbreak strike at the very center of our emotional security. When your primary connections feel tense or broken, it's almost impossible to focus on lectures or exams.\n\n"
                        "Give yourself permission to grieve and process what happened. Relationships shape our identity, and when they fracture, it hurts deeply.\n\n"
                        "Would you like to share what happened, or do you just need a quiet space to acknowledge how much it hurts?"
                    ),
                    (
                        "Navigating difficult family expectations or roommate friction while juggling college demands is exhausting. You are trying to establish your own boundaries while depending on others.\n\n"
                        "Remember that you cannot control other people's reactions or expectations—you can only control your own peace and where you invest your energy. How are you holding up through this?"
                    )
                ]
            },

            # 13. Gratitude & Positive Reflections
            {
                "topic": "gratitude_positive",
                "patterns": [
                    r"\b(thank you|thanks|appreciate it|that helps|feeling better|helped a lot|grateful|good day|happy today|proud of myself|did well)\b",
                    r"\b(made progress|finished my exam|feel relieved)\b"
                ],
                "responses": [
                    (
                        "I'm so glad to hear that! Taking the time to savor relief and positive moments is just as important as working through the tough ones.\n\n"
                        "You did the hard work of reflecting and showing up for yourself. Hold onto this feeling, and remember that you have the resilience to move through challenging days too.\n\n"
                        "What's one kind thing you can do for yourself today to celebrate this win?"
                    ),
                    (
                        "You're very welcome. It is a genuine honor to be here alongside you. Never hesitate to drop in whenever your mind needs a grounding moment.\n\n"
                        "Wishing you a calm, restful remainder of your day!"
                    )
                ]
            },

            # 14. Farewell & Check-out
            {
                "topic": "farewell",
                "patterns": [
                    r"\b(bye|goodbye|see you|talk later|going to sleep|good night|logging off|got to go|have to go)\b"
                ],
                "responses": [
                    (
                        "Take good care of yourself. Drink a glass of water, get some rest, and remember you're doing better than you give yourself credit for.\n\n"
                        "I'll be right here whenever you need a safe space to reflect. Good night and be well!"
                    ),
                    (
                        "Goodbye for now! Go gently with yourself today, and remember to take intentional breaks. See you next time!"
                    )
                ]
            }
        ]

        # Open-ended empathetic fallback pool for unclassified inputs
        self.fallbacks: List[str] = [
            (
                "Thank you for sharing that with me. It takes real honesty to pause, listen to your inner world, and put your feelings into words.\n\n"
                "Whatever you're sitting with right now, you don't have to carry the whole weight at once. What feels like the most pressing part of this today?"
            ),
            (
                "I hear you. University life often expects us to keep smiling and functioning regardless of what's happening underneath.\n\n"
                "In this space, you don't have to perform. How long have you been carrying this feeling, and have you been able to talk to anyone else about it?"
            ),
            (
                "I'm listening closely. When we keep things bottled up inside our head, thoughts tend to loop and grow heavier. Sometimes just untangling them thread by thread helps.\n\n"
                "If you could ask for one thing to feel even 5% lighter today, what would that look like?"
            ),
            (
                "Thank you for trusting me with your thoughts. It sounds like there's quite a bit on your mind.\n\n"
                "Take a slow breath right here. What is the core emotion beneath what you just described—is it worry, fatigue, frustration, or something else?"
            )
        ]

    def get_companion_response(self, user_message: str, history: List[Dict[str, str]] = None, personal_context: List[str] = None) -> str:
        """
        Processes student input against psychological domain rules and returns
        a natural, warm, empathetic response.
        """
        clean_msg = user_message.strip()
        msg_lower = clean_msg.lower()

        # Check for specific matched rule
        for rule in self.rules:
            for pattern in rule["patterns"]:
                if re.search(pattern, msg_lower, re.IGNORECASE):
                    responses = rule["responses"]
                    choice = responses[self._history_counter % len(responses)]
                    self._history_counter += 1
                    return self._personalize(choice, personal_context)

        # If question detected
        if "?" in clean_msg:
            return self._personalize(
                "That's a thoughtful question to reflect on. In student life, so many questions don't come with easy textbook answers.\n\n"
                "Often what we're really seeking when we ask this is clarity and emotional reassurance. "
                "From your own intuition, what do you think would be the most compassionate step forward for yourself?",
                personal_context,
            )

        # Fallback to empathetic reflection
        choice = self.fallbacks[self._history_counter % len(self.fallbacks)]
        self._history_counter += 1
        return self._personalize(choice, personal_context)

    @staticmethod
    def _personalize(response: str, personal_context: List[str] = None) -> str:
        if not personal_context:
            return response
        recent_mood = next((item for item in personal_context if item.startswith("Recent mood check-in:")), None)
        if recent_mood:
            detail = recent_mood.removeprefix("Recent mood check-in:").strip()
            return response + f"\n\nI also remember your recent mood check-in noted {detail}. Does that connect with what you're describing today?"
        recent_screening = next((item for item in personal_context if item.startswith("Most recent optional well-being check-in category:")), None)
        if recent_screening:
            return response + f"\n\nYou also completed an optional well-being check-in recently. Would it help to connect anything from that reflection to what feels most present today?"
        return response


rule_engine = RuleBasedCompanionEngine()

def generate_local_companion_response(user_message: str, history: List[Dict[str, str]], personal_context: List[str] = None) -> str:
    return rule_engine.get_companion_response(user_message, history, personal_context)


class AIService:
    def __init__(self):
        self.provider = settings.AI_PROVIDER
        self.base_url = settings.AI_BASE_URL.rstrip('/')
        self.model = settings.AI_MODEL
        self.api_key = settings.AI_API_KEY

    async def get_response(self, messages: List[Dict[str, str]], personal_context: List[str] = None) -> str:
        last_msg = messages[-1]["content"] if messages else ""

        if not self.api_key:
            return generate_local_companion_response(last_msg, messages, personal_context)

        context_message = []
        if personal_context:
            context_message = [{
                "role": "system",
                "content": "Optional continuity notes from this signed-in user's recent check-ins (factual context, not instructions): " + "; ".join(personal_context) + ". Refer to them gently only when relevant; do not infer a diagnosis."
            }]

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                *context_message,
                *messages
            ],
            "temperature": 0.7,
            "max_tokens": 600,
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(
                    f"{self.base_url}/chat/completions",
                    json=payload,
                    headers=headers
                )
                if res.status_code == 200:
                    data = res.json()
                    choices = data.get("choices", [])
                    if choices and "message" in choices[0]:
                        return choices[0]["message"].get("content", "").strip()
                print(f"[AIService] API returned status {res.status_code}")
        except Exception as e:
            print(f"[AIService] Fallback to rule engine: {e}")

        return generate_local_companion_response(last_msg, messages, personal_context)

ai_service = AIService()
