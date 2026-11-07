from app.services.topic_classifier import classify_topic, DEFAULT_TOPIC


def test_topic_examples():
    assert classify_topic(["I can't sleep and I'm so tired all the time"]) == "sleep"
    assert classify_topic(["I feel so lonely, I don't belong here"]) == "belonging"
    assert classify_topic(["My exam is tomorrow and the assignment is due"]) == "academic"
    assert classify_topic(["Can you guide me through box breathing?"]) == "calm"
    assert classify_topic(["I keep having panic attacks and feel so anxious"]) == "anxiety"


def test_default_when_nothing_matches():
    assert classify_topic([]) == DEFAULT_TOPIC
    assert classify_topic(["hello"]) == DEFAULT_TOPIC
