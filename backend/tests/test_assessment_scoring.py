"""Unit tests for the PHQ-9 / GAD-7 scoring bands (no API or database needed)."""
from app.routers.assessments import (
    QUESTIONS, MAX_TOTAL, phq9_band, gad7_band, score_answers,
)


def answers_with(phq=0, gad=0, stress=0, item9=0):
    """Spread a target score across each section's questions (max 3 per item)."""
    out = {}
    for section, target in (("phq9", phq), ("gad7", gad), ("stress", stress)):
        ids = [q["id"] for q in QUESTIONS if q["section"] == section]
        left = target
        for qid in ids:
            give = min(3, left)
            out[qid] = give
            left -= give
    if item9:
        out[9] = item9
    return out


def test_question_bank_shape():
    assert len(QUESTIONS) == 20
    assert MAX_TOTAL == 60
    assert sum(1 for q in QUESTIONS if q["section"] == "phq9") == 9
    assert sum(1 for q in QUESTIONS if q["section"] == "gad7") == 7


def test_phq9_cut_points():
    cases = {0: "Minimal", 4: "Minimal", 5: "Mild", 9: "Mild", 10: "Moderate",
             14: "Moderate", 15: "Moderately severe", 19: "Moderately severe", 20: "Severe", 27: "Severe"}
    for score, label in cases.items():
        assert phq9_band(score)["label"] == label, score


def test_gad7_cut_points():
    cases = {0: "Minimal", 4: "Minimal", 5: "Mild", 9: "Mild", 10: "Moderate", 14: "Moderate", 15: "Severe", 21: "Severe"}
    for score, label in cases.items():
        assert gad7_band(score)["label"] == label, score


def test_overall_takes_worst_validated_scale():
    result = score_answers(answers_with(phq=3, gad=12))
    assert result["category"] == "moderate"


def test_severe_phq_is_elevated():
    assert score_answers(answers_with(phq=20))["category"] == "elevated"


def test_very_high_student_strain_bumps_one_level():
    assert score_answers(answers_with(phq=3, gad=3, stress=10))["category"] == "mild"
    assert score_answers(answers_with(phq=0, gad=0, stress=10))["category"] == "mild"


def test_item9_sets_safety_flag_even_when_total_is_low():
    result = score_answers(answers_with(item9=1))
    assert result["safety_flag"] is True
    assert score_answers(answers_with(phq=2))["safety_flag"] is False
