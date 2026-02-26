"""
Upload artifact paths to Google Drive via Service Account.
Returns {artifact_type: share_url or file_id}.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any


# Optional: only used when GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON is set
def _get_drive_service():
    from google.oauth2 import service_account
    from googleapiclient.discovery import build

    raw = os.environ.get("GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON")
    if not raw:
        return None
    try:
        info = json.loads(raw)
    except json.JSONDecodeError:
        # path to file
        with open(raw) as f:
            info = json.load(f)
    creds = service_account.Credentials.from_service_account_info(info)
    return build("drive", "v3", credentials=creds)


async def save_to_google_drive(
    paths: dict[str, Path],
    folder_id: str,
) -> dict[str, str]:
    """
    Upload files to Drive folder_id. Returns {artifact_type: webViewLink or id}.
    If Drive not configured, returns empty dict.
    """
    folder_id = folder_id or os.environ.get("GOOGLE_DRIVE_FOLDER_ID")
    if not folder_id:
        return {}
    drive = _get_drive_service()
    if not drive:
        return {}
    result: dict[str, str] = {}
    for art_type, path in paths.items():
        path = Path(path)
        if not path.exists():
            continue
        from googleapiclient.http import MediaFileUpload

        name = path.name
        meta = {"name": name, "parents": [folder_id]}
        media = MediaFileUpload(str(path), resumable=True)
        try:
            f = (
                drive.files()
                .create(body=meta, media_body=media, fields="id,webViewLink")
                .execute()
            )
            result[art_type] = f.get("webViewLink") or f.get("id") or ""
        except Exception:
            result[art_type] = ""
    return result
