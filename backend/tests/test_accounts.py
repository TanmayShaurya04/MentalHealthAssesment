import pytest
from tests.helpers import client, register, bearer


@pytest.mark.asyncio
async def test_cookie_session_and_logout():
    async with client() as c:
        await register(c, "cookie.user@example.com")
        # httpx keeps the httpOnly cookie, so no Authorization header is needed
        me = await c.get("/api/users/me")
        assert me.status_code == 200 and me.json()["email"] == "cookie.user@example.com"
        assert me.json()["role"] == "student"
        assert me.json()["email_verified"] is False
        await c.post("/api/auth/logout")
        c.cookies.clear()
        assert (await c.get("/api/users/me")).status_code == 401


@pytest.mark.asyncio
async def test_password_strength_rules():
    async with client() as c:
        res = await c.post("/api/auth/register", json={"name": "Weak Pw", "email": "weak@example.com", "password": "onlyletters"})
        assert res.status_code == 422


@pytest.mark.asyncio
async def test_forgot_and_reset_password_is_single_use():
    async with client() as c:
        await register(c, "reset.me@example.com", password="OldPass123")
        # Same answer whether or not the email exists
        unknown = await c.post("/api/auth/forgot-password", json={"email": "nobody@example.com"})
        known = await c.post("/api/auth/forgot-password", json={"email": "reset.me@example.com"})
        assert unknown.status_code == known.status_code == 200
        assert unknown.json()["message"] == known.json()["message"]
        assert "dev_reset_link" not in unknown.json()

        token = known.json()["dev_reset_link"].split("token=")[1]
        ok = await c.post("/api/auth/reset-password", json={"token": token, "new_password": "NewPass456"})
        assert ok.status_code == 200
        reuse = await c.post("/api/auth/reset-password", json={"token": token, "new_password": "Another789"})
        assert reuse.status_code == 400  # link stops working once the password has changed

        assert (await c.post("/api/auth/login", json={"email": "reset.me@example.com", "password": "OldPass123"})).status_code == 401
        assert (await c.post("/api/auth/login", json={"email": "reset.me@example.com", "password": "NewPass456"})).status_code == 200


@pytest.mark.asyncio
async def test_a_login_token_cannot_be_used_as_a_reset_token():
    async with client() as c:
        body = await register(c, "wrong.token@example.com")
        res = await c.post("/api/auth/reset-password", json={"token": body["access_token"], "new_password": "Sneaky123"})
        assert res.status_code == 400


@pytest.mark.asyncio
async def test_email_verification():
    async with client() as c:
        body = await register(c, "verify.me@example.com")
        link = body["dev_verify_link"]
        res = await c.post("/api/auth/verify-email", json={"token": link.split("token=")[1]})
        assert res.status_code == 200
        assert (await c.get("/api/users/me")).json()["email_verified"] is True


@pytest.mark.asyncio
async def test_change_password():
    async with client() as c:
        await register(c, "change.pw@example.com", password="StartPass1")
        bad = await c.post("/api/users/me/change-password", json={"current_password": "wrong", "new_password": "BrandNew22"})
        assert bad.status_code == 400
        ok = await c.post("/api/users/me/change-password", json={"current_password": "StartPass1", "new_password": "BrandNew22"})
        assert ok.status_code == 200
        c.cookies.clear()
        assert (await c.post("/api/auth/login", json={"email": "change.pw@example.com", "password": "BrandNew22"})).status_code == 200


@pytest.mark.asyncio
async def test_consent_is_recorded():
    async with client() as c:
        await register(c, "consent@example.com")
        assert (await c.get("/api/users/me")).json()["consent"] is None
        await c.post("/api/users/me/consent", json={"version": "2026-11"})
        consent = (await c.get("/api/users/me")).json()["consent"]
        assert consent["version"] == "2026-11" and consent["accepted_at"]


@pytest.mark.asyncio
async def test_export_then_delete_removes_everything():
    async with client() as c:
        await register(c, "leaving@example.com", password="LeavePass1")
        await c.post("/api/moods", json={"level": "good", "score": 4, "note": "fine"})
        await c.post("/api/journals", json={"title": "Private", "content": "secret words"})
        export = await c.get("/api/users/me/export")
        assert export.status_code == 200
        data = export.json()
        assert len(data["moods"]) == 1 and data["journals"][0]["title"] == "Private"
        assert "password_hash" not in str(data)

        wrong = await c.request("DELETE", "/api/users/me", json={"password": "nope"})
        assert wrong.status_code == 400
        gone = await c.request("DELETE", "/api/users/me", json={"password": "LeavePass1"})
        assert gone.status_code == 200

        c.cookies.clear()
        assert (await c.post("/api/auth/login", json={"email": "leaving@example.com", "password": "LeavePass1"})).status_code == 401
        from app.database import db_manager
        assert await db_manager.get_collection("journals").find({"title": "Private"}).to_list(length=10) == []
        assert await db_manager.get_collection("moods").find({"note": "fine"}).to_list(length=10) == []


@pytest.mark.asyncio
async def test_roles_are_enforced():
    async with client() as c:
        student = await register(c, "just.student@example.com")
        h = bearer(student)
        for path in ("/api/counsellor/summary", "/api/admin/stats", "/api/admin/crisis-events"):
            assert (await c.get(path, headers=h)).status_code == 403, path
        # Students can no longer confirm their own booking
        assert (await c.patch("/api/appointments/anything/status", headers=h, json={"status": "confirmed"})).status_code in (404, 405)


@pytest.mark.asyncio
async def test_public_config_and_counsellor_video_link_hidden():
    async with client() as c:
        cfg = (await c.get("/api/config")).json()
        assert cfg["demo_mode"] is True
        for counsellor in (await c.get("/api/counsellors")).json():
            assert counsellor["video_meet_link"] == ""
            assert counsellor["is_demo"] is True


@pytest.mark.asyncio
async def test_security_headers_present():
    async with client() as c:
        res = await c.get("/api/health")
        assert res.headers["x-content-type-options"] == "nosniff"
        assert res.headers["x-frame-options"] == "DENY"
        assert "frame-ancestors 'none'" in res.headers["content-security-policy"]


@pytest.mark.asyncio
async def test_safety_plan_roundtrip_and_privacy():
    async with client() as c:
        await register(c, "plan.user@example.com", password="Passw0rdOK")
        empty = await c.get("/api/users/me/safety-plan")
        assert empty.status_code == 200 and empty.json()["warning_signs"] == []
        saved = await c.put("/api/users/me/safety-plan", json={
            "warning_signs": ["  can't sleep ", ""], "coping_strategies": ["walk"],
            "contacts": [{"name": "Riya", "phone": "9999999999"}, {"name": "", "phone": ""}],
            "reasons_to_live": "my family"})
        assert saved.status_code == 200
        plan = (await c.get("/api/users/me/safety-plan")).json()
        assert plan["warning_signs"] == ["can't sleep"] and len(plan["contacts"]) == 1
        # Not leaked in the public profile, but included in the data export
        assert "safety_plan" not in (await c.get("/api/users/me")).json()
        assert (await c.get("/api/users/me/export")).json()["safety_plan"]["reasons_to_live"] == "my family"


@pytest.mark.asyncio
async def test_verify_password_for_screen_lock():
    async with client() as c:
        await register(c, "lock.user@example.com", password="Passw0rdOK")
        assert (await c.post("/api/users/me/verify-password", json={"password": "Passw0rdOK"})).status_code == 200
        bad = await c.post("/api/users/me/verify-password", json={"password": "wrong"})
        assert bad.status_code == 400
        # A wrong guess must not end the session
        assert (await c.get("/api/users/me")).status_code == 200
