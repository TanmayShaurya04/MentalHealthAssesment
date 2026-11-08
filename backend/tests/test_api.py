import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app

import datetime

def next_slot_date(counsellor):
    """The next calendar date that falls on one of the counsellor's working days."""
    names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    d = datetime.date.today() + datetime.timedelta(days=2)
    while names[d.weekday()] not in counsellor["available_days"]:
        d += datetime.timedelta(days=1)
    return d.isoformat()


@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"
        assert data["service"] == "serenova-api"

from app.seed_data import seed_database_if_empty

@pytest.mark.asyncio
async def test_full_student_journey():
    await seed_database_if_empty()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Register student
        reg_payload = {
            "name": "Aarav Sharma",
            "email": "aarav.sharma@university.edu",
            "password": "Password123!",
            "university": "Delhi University",
            "year_of_study": "2nd Year"
        }
        res_reg = await client.post("/api/auth/register", json=reg_payload)
        assert res_reg.status_code in [200, 400] # 400 if already created in earlier test run
        
        # 2. Login
        login_res = await client.post("/api/auth/login", json={
            "email": "aarav.sharma@university.edu",
            "password": "Password123!"
        })
        assert login_res.status_code == 200
        auth_data = login_res.json()
        token = auth_data["access_token"]
        assert token
        headers = {"Authorization": f"Bearer {token}"}
        
        # 3. Get profile /me
        me_res = await client.get("/api/users/me", headers=headers)
        assert me_res.status_code == 200
        assert me_res.json()["name"] == "Aarav Sharma"
        
        # 4. Log mood
        mood_res = await client.post("/api/moods", json={
            "level": "good",
            "score": 4,
            "note": "Finished my presentation and feel relieved.",
            "tags": ["Study", "Relief"]
        }, headers=headers)
        assert mood_res.status_code == 200
        mood_id = mood_res.json()["id"]
        
        # Get moods
        moods_list = await client.get("/api/moods", headers=headers)
        assert moods_list.status_code == 200
        assert len(moods_list.json()) >= 1
        
        # Mood stats
        stats_res = await client.get("/api/moods/stats", headers=headers)
        assert stats_res.status_code == 200
        assert stats_res.json()["total_logs"] >= 1
        
        # 5. Create private journal
        journal_res = await client.post("/api/journals", json={
            "title": "A quiet evening after exams",
            "content": "Today was the first day in weeks where my phone did not buzz with project alerts.",
            "mood_level": "good",
            "tags": ["Reflection", "Rest"]
        }, headers=headers)
        assert journal_res.status_code == 200
        journal_id = journal_res.json()["id"]
        
        # Read journal
        j_get = await client.get(f"/api/journals/{journal_id}", headers=headers)
        assert j_get.status_code == 200
        assert j_get.json()["title"] == "A quiet evening after exams"
        
        # 6. Assessment questions & submission
        q_res = await client.get("/api/assessments/questions")
        assert q_res.status_code == 200
        assert len(q_res.json()["questions"]) == 20
        assert [s["id"] for s in q_res.json()["sections"]] == ["phq9", "gad7", "stress"]

        # Incomplete submissions are rejected
        partial = await client.post("/api/assessments", json={
            "answers": [{"question_id": i, "score": 1} for i in range(1, 10)]
        }, headers=headers)
        assert partial.status_code == 422

        assess_submit = await client.post("/api/assessments", json={
            "answers": [{"question_id": i, "score": 1} for i in range(1, 21)]
        }, headers=headers)
        assess_body = assess_submit.json()
        assert assess_submit.status_code == 200
        assert assess_body["total_score"] == 20
        assert assess_body["max_score"] == 60
        # PHQ-9 = 9 (mild), GAD-7 = 7 (mild), student = 4 (some strain)
        assert assess_body["category"] == "mild"
        assert assess_body["safety_flag"] is True  # item 9 answered above zero
        assert {s["id"]: s["score"] for s in assess_body["sections"]} == {"phq9": 9, "gad7": 7, "stress": 4}
        
        # 7. Counsellor Directory
        couns_res = await client.get("/api/counsellors")
        assert couns_res.status_code == 200
        counsellors = couns_res.json()
        assert len(counsellors) >= 1
        selected_counsellor = counsellors[0]
        
        # 8. Book Appointment with Counsellor
        appt_res = await client.post("/api/appointments", json={
            "counsellor_id": selected_counsellor["id"],
            "support_type": "academic_stress",
            "preferred_date": next_slot_date(selected_counsellor),
            "time_slot": selected_counsellor["available_slots"][0],
            "student_notes": "Would appreciate guidance on managing thesis pressure."
        }, headers=headers)
        assert appt_res.status_code == 200
        appt_id = appt_res.json()["id"]
        assert appt_res.json()["status"] == "pending"
        assert appt_res.json()["counsellor_name"] == selected_counsellor["name"]
        
        # List appointments
        appts_list = await client.get("/api/appointments", headers=headers)
        assert appts_list.status_code == 200
        assert len(appts_list.json()) >= 1
        
        # Cancel appointment
        cancel_res = await client.patch(f"/api/appointments/{appt_id}/cancel", headers=headers)
        assert cancel_res.status_code == 200
        assert cancel_res.json()["status"] == "cancelled"
        
        # 9. AI Companion Chat
        session_res = await client.post("/api/chat/sessions", json={"title": "Midterm Check-in"}, headers=headers)
        assert session_res.status_code == 200
        session_id = session_res.json()["id"]
        
        # Send supportive message
        chat_msg_res = await client.post(
            f"/api/chat/sessions/{session_id}/messages",
            json={"content": "I feel anxious about whether I can pass my exams."},
            headers=headers
        )
        assert chat_msg_res.status_code == 200
        assert chat_msg_res.json()["role"] == "assistant"
        assert len(chat_msg_res.json()["content"]) > 10
        assert chat_msg_res.json()["safety_flagged"] is False
        
        # Send message with crisis words -> verifies deterministic safety intercept
        crisis_msg_res = await client.post(
            f"/api/chat/sessions/{session_id}/messages",
            json={"content": "I feel hopeless and want to end my life."},
            headers=headers
        )
        assert crisis_msg_res.status_code == 200
        assert crisis_msg_res.json()["safety_flagged"] is True
        assert "Tele-MANAS" in crisis_msg_res.json()["content"]

        # Conversation is filed under a topic and flagged for crisis content
        sessions_after = await client.get("/api/chat/sessions", headers=headers)
        filed = next(x for x in sessions_after.json() if x["id"] == session_id)
        assert filed["topic"] in ("academic", "anxiety")  # message mentions both exams and anxiety
        assert filed["has_crisis"] is True
        by_topic = await client.get(f"/api/chat/sessions?topic={filed['topic']}", headers=headers)
        assert any(x["id"] == session_id for x in by_topic.json())
        topics = await client.get("/api/chat/topics", headers=headers)
        assert topics.status_code == 200
        
        # 10. Curated resources
        res_list = await client.get("/api/resources")
        assert res_list.status_code == 200
        assert len(res_list.json()) >= 1


@pytest.mark.asyncio
async def test_booked_slots_endpoint_hides_student_details():
    await seed_database_if_empty()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/counsellors/counsellor-01/booked")
        assert res.status_code == 200
        for row in res.json():
            assert set(row) == {"date", "slot"}
