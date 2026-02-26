"""
Failure alerts: Slack webhook (preferred) or email.
Trigger on: FAIL validation, Drive write error, fetch HTTP 5xx.
"""

from __future__ import annotations

import os
import urllib.request
import urllib.error


def send_slack(message: str) -> bool:
    """Post message to SLACK_WEBHOOK_URL. Returns True if sent."""
    url = os.environ.get("SLACK_WEBHOOK_URL")
    if not url:
        return False
    try:
        req = urllib.request.Request(
            url,
            data=__import__("json").dumps({"text": message}).encode(),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        urllib.request.urlopen(req, timeout=10)
        return True
    except Exception:
        return False


def send_alert(
    subject: str,
    body: str,
    *,
    on_fail: bool = True,
) -> None:
    """Send alert to Slack; optionally fallback to ALERT_EMAIL (SMTP not implemented in MVP)."""
    full = f"*{subject}*\n{body}"
    if send_slack(full):
        return
    if on_fail and os.environ.get("ALERT_EMAIL"):
        # MVP: could log and/or write to a file for manual email
        pass
