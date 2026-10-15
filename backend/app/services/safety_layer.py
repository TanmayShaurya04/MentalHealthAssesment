import re
from typing import Tuple, Dict, Any

# Crisis keywords & phrases (deterministic pre-screening)
CRISIS_PATTERNS = [
    r"\b(suicide|suicidal|kill myself|want to die|end my life|end it all)\b",
    r"\b(hang myself|cut myself|slit my wrist|self harm|self-harm|hurting myself)\b",
    r"\b(take all my pills|overdose|jump off|jump from|not want to live)\b",
    r"\b(goodbye cruel world|better off dead|no reason to live)\b",
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
