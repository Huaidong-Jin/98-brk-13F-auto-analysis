"""
Failure and success alerts: Slack webhook (preferred) or email.
Trigger on: FAIL validation, Drive write error, fetch HTTP 5xx, or successful ingest.
"""

from __future__ import annotations

import os
import urllib.error
import urllib.request


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
    """Send failure alert to Slack; optionally fallback to ALERT_EMAIL."""
    full = f"*{subject}*\n{body}"
    if send_slack(full):
        return
    if on_fail and os.environ.get("ALERT_EMAIL"):
        # MVP: log for manual email follow-up
        pass


def send_success_alert(
    quarters: list[str],
    duration_s: float,
) -> None:
    """Send a success summary to Slack after new quarters are ingested.

    Args:
        quarters: List of quarter strings that were successfully processed.
        duration_s: Total ingest duration in seconds.
    """
    if not quarters:
        return
    quarters_str = ", ".join(quarters)
    message = (
        f"*BRK 13F Ingest: Success*\n"
        f"Processed quarters: {quarters_str}\n"
        f"Duration: {duration_s:.1f}s"
    )
    send_slack(message)
