import pytest
from tests.helpers import client, register, login, bearer, next_slot_date


async def _book(c, student_headers, counsellor, days=2, slot_index=0):
    return await c.post("/api/appointments", headers=student_headers, json={
        "counsellor_id": counsellor["id"], "support_type": "academic_stress",
        "preferred_date": next_slot_date(counsellor, days), "time_slot": counsellor["available_slots"][slot_index],
        "student_notes": "Exam stress",
    })


@pytest.mark.asyncio
async def test_booking_confirm_reschedule_complete_flow():
    async with client() as c:
        student = bearer(await register(c, "booker@example.com"))
        counsellors = (await c.get("/api/counsellors")).json()
        ananya = next(x for x in counsellors if x["id"] == "counsellor-01")

        booked = await _book(c, student, ananya)
        assert booked.status_code == 200
        appt_id = booked.json()["id"]
        assert booked.json()["status"] == "pending"
        assert not booked.json().get("video_meet_link")

        # Second student can't take the same slot
        other = bearer(await register(c, "late.booker@example.com"))
        assert (await _book(c, other, ananya)).status_code == 409

        # Counsellor sees the request, with the student's name and notes but not their email
        counsellor = bearer(await login(c, "ananya.sen@serenova.demo"))
        summary = (await c.get("/api/counsellor/summary", headers=counsellor)).json()
        assert summary["pending"] >= 1
        queue = (await c.get("/api/counsellor/appointments?status=pending", headers=counsellor)).json()
        mine = next(a for a in queue if a["id"] == appt_id)
        assert mine["student_name"] == "Test Student" and mine["student_notes"] == "Exam stress"
        assert "email" not in mine

        # Confirm: student now gets the video link
        done = await c.patch(f"/api/counsellor/appointments/{appt_id}", headers=counsellor,
                             json={"status": "confirmed", "message": "See you then"})
        assert done.status_code == 200 and done.json()["status"] == "confirmed"
        seen = (await c.get(f"/api/appointments/{appt_id}", headers=student)).json()
        assert seen["status"] == "confirmed" and seen["video_meet_link"].startswith("https://meet.jit.si/")
        assert seen["counsellor_message"] == "See you then"

        # Private note stays private
        assert (await c.put(f"/api/counsellor/appointments/{appt_id}/note", headers=counsellor, json={"note": "Follow up on sleep"})).status_code == 200
        assert "counsellor_note" not in (await c.get(f"/api/appointments/{appt_id}", headers=student)).json()
        assert "Follow up" not in str((await c.get("/api/users/me/export", headers=student)).json())

        # Reschedule to a later day, then complete
        later = next_slot_date(ananya, 9)
        moved = await c.patch(f"/api/counsellor/appointments/{appt_id}", headers=counsellor,
                              json={"preferred_date": later, "time_slot": ananya["available_slots"][1]})
        assert moved.status_code == 200 and moved.json()["preferred_date"] == later
        assert (await c.patch(f"/api/counsellor/appointments/{appt_id}", headers=counsellor, json={"status": "completed"})).status_code == 200


@pytest.mark.asyncio
async def test_counsellors_cannot_touch_each_others_requests():
    async with client() as c:
        student = bearer(await register(c, "cross@example.com"))
        counsellors = (await c.get("/api/counsellors")).json()
        rohan = next(x for x in counsellors if x["id"] == "counsellor-02")
        appt_id = (await _book(c, student, rohan)).json()["id"]
        ananya_login = bearer(await login(c, "ananya.sen@serenova.demo"))
        res = await c.patch(f"/api/counsellor/appointments/{appt_id}", headers=ananya_login, json={"status": "confirmed"})
        assert res.status_code == 404


@pytest.mark.asyncio
async def test_booking_validation():
    async with client() as c:
        student = bearer(await register(c, "validate@example.com"))
        ananya = next(x for x in (await c.get("/api/counsellors")).json() if x["id"] == "counsellor-01")
        base = {"counsellor_id": ananya["id"], "support_type": "academic_stress"}
        past = await c.post("/api/appointments", headers=student, json={**base, "preferred_date": "2020-01-06", "time_slot": ananya["available_slots"][0]})
        assert past.status_code == 422
        bad_slot = await c.post("/api/appointments", headers=student, json={**base, "preferred_date": next_slot_date(ananya), "time_slot": "03:33 AM"})
        assert bad_slot.status_code == 422
        # A day the counsellor doesn't work (Ananya: Mon, Wed, Thu, Fri)
        import datetime
        d = datetime.date.today() + datetime.timedelta(days=2)
        while d.strftime("%a") in ananya["available_days"]:
            d += datetime.timedelta(days=1)
        off = await c.post("/api/appointments", headers=student, json={**base, "preferred_date": d.isoformat(), "time_slot": ananya["available_slots"][0]})
        assert off.status_code == 422


@pytest.mark.asyncio
async def test_availability_editor_and_declined_slot_reopens():
    async with client() as c:
        counsellor = bearer(await login(c, "meera.nambiar@serenova.demo"))
        cur = (await c.get("/api/counsellor/availability", headers=counsellor)).json()
        bad = await c.put("/api/counsellor/availability", headers=counsellor, json={**cur, "available_slots": ["noonish"]})
        assert bad.status_code == 422
        ok = await c.put("/api/counsellor/availability", headers=counsellor,
                         json={"available_days": cur["available_days"], "available_slots": ["04:00 PM", "9:30 AM"], "is_accepting_students": True})
        assert ok.status_code == 200 and ok.json()["available_slots"] == ["09:30 AM", "04:00 PM"]

        student = bearer(await register(c, "reopen@example.com"))
        meera = next(x for x in (await c.get("/api/counsellors")).json() if x["id"] == "counsellor-03")
        appt = (await _book(c, student, meera)).json()
        await c.patch(f"/api/counsellor/appointments/{appt['id']}", headers=counsellor, json={"status": "declined"})
        other = bearer(await register(c, "reopen2@example.com"))
        assert (await _book(c, other, meera)).status_code == 200  # declined slots can be booked again
