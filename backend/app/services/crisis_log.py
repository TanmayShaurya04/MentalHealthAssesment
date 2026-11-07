"""
Crisis-event log.

Records THAT a crisis message or a self-harm answer happened, never WHAT was written:
no message text is stored. Admins use it to see how often students need urgent support
(so the helpline messaging and counsellor capacity can be reviewed), and to check the safety layer is firing.
"""
import datetime
from typing import Optional

from app.database import db_manager


async def log_crisis_event(user_id: Optional[str], source: str, ref_id: Optional[str] = None) -> None:
    try:
        await db_manager.get_collection("crisis_events").insert_one({
            "user_id": user_id,
            "source": source,          # "chat" | "assessment"
            "ref_id": ref_id,          # session id or assessment id, never content
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        })
    except Exception as exc:  # noqa: BLE001  (logging must never break the student's request)
        print(f"[CrisisLog] could not record event: {exc}")
