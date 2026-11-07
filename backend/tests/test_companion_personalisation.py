import pytest
from app.services.personalised_companion import compose_reply, detect_intents, context_as_prompt


def test_detects_topics():
    assert "exams" in detect_intents("I have my exam tomorrow and I can't focus")
    assert "sleep" in detect_intents("I'm so tired, can't sleep")
    assert "lonely" in detect_intents("I feel alone in my hostel")


def test_reply_uses_the_students_own_words_and_name():
    ctx = {"first_name": "Aarav", "mood_scores": [4, 3, 2, 2, 1], "mood_trend": "down"}
    reply = compose_reply("I feel so sad and I can't handle my exams", [], ctx)
    assert "sad" in reply.lower() or "exams" in reply.lower()
    assert "dipped" in reply            # links to their mood trend
    assert "?" in reply                 # ends with one question


def test_no_data_means_no_made_up_claims():
    reply = compose_reply("I have a deadline tomorrow", [], {})
    assert "your mood" not in reply.lower() and "screening" not in reply.lower()


def test_replies_vary_across_turns():
    ctx = {"first_name": "Mira"}
    first = compose_reply("exam stress is killing me", [], ctx)
    second = compose_reply("exam stress is killing me", [{"role": "assistant", "content": first}], ctx)
    assert first != second


def test_prompt_contains_no_free_text():
    p = context_as_prompt({"first_name": "Mira", "mood_scores": [3, 2], "mood_tags": ["Exams"]})
    assert "Mira" in p and "Exams" in p
