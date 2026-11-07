"""
Lightweight, deterministic topic tagging for AI Companion conversations.

Each conversation is tagged with the one topic that best matches what the student
has written, so the sidebar can group and filter chats. Nothing here is sent to an
external service and it never makes a clinical judgement; it is only a filing label.
"""
import re
from typing import Dict, Iterable, List

TOPICS: Dict[str, Dict[str, object]] = {
    "academic": {
        "label": "Academics & exams",
        "keywords": [
            "exam", "deadline", "assignment", "study", "studying", "grades", "gpa", "marks",
            "backlog", "viva", "thesis", "project", "placement", "lecture", "semester",
            "procrastinat", "padhai", "padhna", "result",
        ],
    },
    "anxiety": {
        "label": "Anxiety & worry",
        "keywords": [
            "anxious", "anxiety", "panic", "worried", "worry", "nervous", "overthink",
            "racing", "on edge", "scared", "fear", "tension", "ghabra", "dar lag",
        ],
    },
    "sleep": {
        "label": "Sleep & energy",
        "keywords": [
            "sleep", "insomnia", "awake", "tired", "exhausted", "fatigue", "nap",
            "wake up", "nightmare", "neend", "thak",
        ],
    },
    "belonging": {
        "label": "Loneliness & belonging",
        "keywords": [
            "lonely", "alone", "belong", "friends", "friend", "homesick", "roommate",
            "left out", "isolated", "family", "relationship", "breakup", "akela",
        ],
    },
    "low_mood": {
        "label": "Low mood & self-worth",
        "keywords": [
            "sad", "depress", "hopeless", "empty", "numb", "worthless", "failure",
            "not good enough", "crying", "unmotivated", "no motivation", "udaas", "dukhi",
        ],
    },
    "calm": {
        "label": "Calming & grounding",
        "keywords": [
            "breath", "breathing", "calm", "ground", "relax", "meditat", "mindful",
            "unwind", "box breathing",
        ],
    },
}

DEFAULT_TOPIC = "general"
TOPIC_LABELS: Dict[str, str] = {k: v["label"] for k, v in TOPICS.items()}  # type: ignore[misc]
TOPIC_LABELS[DEFAULT_TOPIC] = "General reflection"

_COMPILED = {
    topic: [re.compile(r"\b" + re.escape(kw), re.IGNORECASE) for kw in spec["keywords"]]  # type: ignore[union-attr]
    for topic, spec in TOPICS.items()
}


def classify_topic(user_messages: Iterable[str]) -> str:
    """Return the best-matching topic key for a list of user messages."""
    text = " \n ".join(user_messages)
    if not text.strip():
        return DEFAULT_TOPIC

    best_topic, best_hits = DEFAULT_TOPIC, 0
    for topic, patterns in _COMPILED.items():
        hits = sum(len(p.findall(text)) for p in patterns)
        if hits > best_hits:
            best_topic, best_hits = topic, hits
    return best_topic


def topic_choices() -> List[Dict[str, str]]:
    return [{"id": k, "label": v} for k, v in TOPIC_LABELS.items()]
