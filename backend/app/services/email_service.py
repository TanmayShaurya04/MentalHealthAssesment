"""
Email sending.

- With SMTP_HOST configured, mail goes out through that SMTP server.
- Without it, the message is printed to the server console and saved to the `outbox`
  collection, so password-reset and reminder flows can be tested locally with no mail server.
"""
import asyncio
import datetime
import smtplib
from email.message import EmailMessage
from html import escape
from typing import Optional

from app.config import settings
from app.database import db_manager


def _send_smtp(msg: EmailMessage) -> None:
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
        if settings.SMTP_STARTTLS:
            server.starttls()
        if settings.SMTP_USER:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.send_message(msg)


def render_html(title: str, body_html: str, button_label: Optional[str] = None, button_url: Optional[str] = None) -> str:
    button = (
        f'<p style="margin:28px 0"><a href="{escape(button_url)}" style="background:#C65D3A;color:#fff;'
        f'padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600">{escape(button_label)}</a></p>'
        if button_label and button_url else ""
    )
    return f"""<!doctype html><html><body style="margin:0;background:#F6F1E8;font-family:Arial,Helvetica,sans-serif;color:#20201D">
<div style="max-width:520px;margin:0 auto;padding:32px 24px">
<h2 style="font-family:Georgia,serif;font-weight:500;margin:0 0 16px">{escape(title)}</h2>
{body_html}{button}
<hr style="border:none;border-top:1px solid #E0D9CF;margin:28px 0 14px">
<p style="font-size:12px;color:#777">Serenova is a student well-being support tool, not an emergency or medical service.
If you need urgent help, call Tele-MANAS on 14416 (free, 24x7) or 112.</p>
</div></body></html>"""


async def send_email(to: str, subject: str, text: str, html: Optional[str] = None) -> bool:
    """Returns True if handed to SMTP (or logged in dev). Never raises: email problems must not break the app."""
    record = {
        "to": to,
        "subject": subject,
        "text": text,
        "sent_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "delivered": False,
    }
    try:
        if settings.EMAIL_ENABLED:
            msg = EmailMessage()
            msg["Subject"] = subject
            msg["From"] = settings.SMTP_FROM
            msg["To"] = to
            msg.set_content(text)
            if html:
                msg.add_alternative(html, subtype="html")
            await asyncio.to_thread(_send_smtp, msg)
            record["delivered"] = True
        else:
            print(f"\n[Email - not sent, no SMTP configured]\nTo: {to}\nSubject: {subject}\n{text}\n")
            # Only keep a dev outbox when demo mode is on, so real deployments never store message bodies.
            if settings.DEMO_MODE:
                await db_manager.get_collection("outbox").insert_one(record)
        return True
    except Exception as exc:  # noqa: BLE001
        print(f"[Email] Failed to send to {to}: {exc}")
        return False
