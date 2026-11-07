"""Shared checks for booking and rescheduling a counselling slot."""
import datetime
from fastapi import HTTPException

WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


def validate_slot(counsellor: dict, date_str: str, slot: str) -> None:
    try:
        day = datetime.date.fromisoformat(date_str)
    except ValueError:
        raise HTTPException(status_code=422, detail="Please choose a valid date (YYYY-MM-DD).")
    if day < datetime.date.today():
        raise HTTPException(status_code=422, detail="Please choose a date that has not passed.")
    if day > datetime.date.today() + datetime.timedelta(days=90):
        raise HTTPException(status_code=422, detail="Bookings open up to 90 days ahead.")
    if WEEKDAYS[day.weekday()] not in counsellor.get("available_days", []):
        days = ", ".join(counsellor.get("available_days", []))
        raise HTTPException(status_code=422, detail=f"This counsellor is available on {days}.")
    if slot not in counsellor.get("available_slots", []):
        raise HTTPException(status_code=422, detail="That time is not one of this counsellor's slots.")


def slot_datetime(date_str: str, slot: str) -> datetime.datetime | None:
    """Combine '2026-11-10' and '11:00 AM' into a datetime (naive, India time as entered). None if unparsable."""
    try:
        return datetime.datetime.strptime(f"{date_str} {slot}", "%Y-%m-%d %I:%M %p")
    except ValueError:
        return None
