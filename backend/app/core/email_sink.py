import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict
from pathlib import Path
from backend.app.config import settings

logger = logging.getLogger("steplight.email_sink")

# In-memory storage for development inspection and automated tests
_dev_email_sink_history: List[Dict[str, str]] = []


def record_password_reset_email(email: str, token: str) -> str:
    """
    Development email sink:
    Records password reset token to local disk log and in-memory test sink.
    Explicitly states in output that this is a development sink, not a remote SMTP provider.
    """
    reset_url = f"http://localhost:5173/reset-password?token={token}"
    timestamp = datetime.now(timezone.utc).isoformat()

    record = {
        "email": email,
        "token": token,
        "reset_url": reset_url,
        "timestamp": timestamp,
    }
    _dev_email_sink_history.append(record)

    log_entry = (
        f"[{timestamp}] [DEV EMAIL SINK] Password Reset Requested for: {email}\n"
        f"  Reset Token: {token}\n"
        f"  Direct Link: {reset_url}\n"
        f"  (Note: No external email provider is configured. Token dispatched to development sink.)\n"
        f"--------------------------------------------------------------------------------\n"
    )

    try:
        sink_path: Path = settings.DEV_EMAIL_SINK_FILE
        sink_path.parent.mkdir(parents=True, exist_ok=True)
        with open(sink_path, "a", encoding="utf-8") as f:
            f.write(log_entry)
    except Exception as e:
        logger.warning(f"Could not append to dev email sink file: {e}")

    # The development sink file is the local mail delivery mechanism; do not also
    # copy its single-use credential into application logs.
    logger.info("password_reset_delivery_recorded")
    return reset_url


def get_latest_reset_token(email: str) -> Optional[str]:
    """Retrieve the most recent token for an email from the dev sink (used by test suites)."""
    for entry in reversed(_dev_email_sink_history):
        if entry["email"].lower() == email.lower():
            return entry["token"]
    return None


def clear_dev_email_sink() -> None:
    """Clear memory history for test isolation."""
    _dev_email_sink_history.clear()
