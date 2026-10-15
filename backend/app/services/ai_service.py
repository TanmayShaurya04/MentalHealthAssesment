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

def generate_local_companion_response(user_message: str, history: List[Dict[str, str]]) -> str:
    """
    Fallback empathetic response when external LLM API key is not configured or offline.
    Ensures zero crashes in all environments.
    """
    msg = user_message.lower()
    if any(w in msg for w in ["exam", "study", "grades", "deadline", "assignment"]):
        return (
            "Academic pressure can feel relentless, especially when deadlines pile up all at once. "
            "Remember that your capacity on any given day doesn't define your intelligence or your future.\n\n"
            "Try breaking down what's ahead into just the next 20 minutes. What is one small, manageable step you could take right now — or would taking a 10-minute breath first serve you better?"
        )
    elif any(w in msg for w in ["sleep", "tired", "insomnia", "exhausted", "burnout"]):
        return (
            "Exhaustion changes how everything feels. When your body and mind haven't had deep rest, even tiny tasks can feel monumental.\n\n"
            "Be extra gentle with yourself today. If you can, step away from screens for a short while, drink a glass of water, and give yourself permission to simply pause."
        )
    elif any(w in msg for w in ["lonely", "alone", "isolated", "friend"]):
        return (
            "University life can look very social from the outside, which makes feeling disconnected or alone feel twice as heavy. Many students feel this exact gap quietly.\n\n"
            "Your presence and feelings are completely valid. Sometimes even stepping outside for fresh air, visiting a campus library, or sending a quick low-pressure hello to someone can help ease that isolation."
        )
    else:
        return (
            f"Thank you for sharing that with me. It takes vulnerability to pause and put your feelings into words.\n\n"
            "Whatever you're sitting with right now, you don't have to solve everything all at once. What feels like the heaviest part of this today?"
        )

class AIService:
    def __init__(self):
        self.provider = settings.AI_PROVIDER
        self.base_url = settings.AI_BASE_URL.rstrip('/')
        self.model = settings.AI_MODEL
        self.api_key = settings.AI_API_KEY

    async def get_response(self, messages: List[Dict[str, str]]) -> str:
        """
        Sends conversation history to OpenAI-compatible LLM endpoint (Groq / Together / etc.).
        Falls back smoothly if no API key is provided or if network fails.
        """
        if not self.api_key:
            # Emulate warm companion
            last_msg = messages[-1]["content"] if messages else ""
            return generate_local_companion_response(last_msg, messages)

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
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
            async with httpx.AsyncClient(timeout=25.0) as client:
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
                print(f"[AIService] API returned status {res.status_code}: {res.text}")
        except Exception as e:
            print(f"[AIService] Request failed: {e}")

        # Fallback if API fails
        last_msg = messages[-1]["content"] if messages else ""
        return generate_local_companion_response(last_msg, messages)

ai_service = AIService()
