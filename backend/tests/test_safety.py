import pytest
from app.services.safety_layer import check_message_safety

def test_safe_message():
    flagged, reply = check_message_safety("I have a lot of assignments due tomorrow and feel stressed.")
    assert flagged is False
    assert reply == ""

def test_crisis_message_suicide():
    flagged, reply = check_message_safety("I want to die, everything is too much.")
    assert flagged is True
    assert "Tele-MANAS" in reply
    assert "iCall" in reply

def test_crisis_message_self_harm():
    flagged, reply = check_message_safety("I feel like hurting myself today.")
    assert flagged is True
    assert "Tele-MANAS" in reply

def test_crisis_message_kill_myself():
    flagged, reply = check_message_safety("I just feel like I should kill myself")
    assert flagged is True
