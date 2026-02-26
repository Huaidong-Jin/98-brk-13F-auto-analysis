"""Build 3-sentence narrative from latest meta (template-based, no LLM)."""

from __future__ import annotations

from typing import TYPE_CHECKING

from app.schemas import NarrativeOut

if TYPE_CHECKING:
    from app.models import FilingMeta


def build_narrative(
    latest: "FilingMeta | None", session: object = None
) -> NarrativeOut | None:
    """Generate question1, question2, question3 from latest quarter data."""
    if not latest:
        return None
    total_b = latest.total_value_usd / 1e9 if latest.total_value_usd else 0
    q1 = f"Berkshire's reported 13F portfolio was ${total_b:.1f}B as of {latest.quarter}."
    q2 = "Concentration is shown in the Top1/Top5/Top10 chart below."
    q3 = "Check the largest holding (often Apple) in the quarter detail and holding time series."
    return NarrativeOut(question1=q1, question2=q2, question3=q3)
