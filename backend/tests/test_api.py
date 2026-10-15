import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app

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
        assert len(q_res.json()["questions"]) == 10
        
        assess_submit = await client.post("/api/assessments", json={
            "answers": [{"question_id": i, "score": 1} for i in range(1, 11)]
        }, headers=headers)
        assert assess_submit.status_code == 200
        assert assess_submit.json()["total_score"] == 10
        assert assess_submit.json()["category"] == "mild"
        
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
            "preferred_date": "2026-10-20",
            "time_slot": "11:00 AM",
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
        
        # 10. Curated resources
        res_list = await client.get("/api/resources")
        assert res_list.status_code == 200
        assert len(res_list.json()) >= 1
