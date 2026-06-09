from typing import List

from pydantic import BaseModel, Field


class BulletFix(BaseModel):
    original: str = Field(..., description="Weak resume bullet point copied from the candidate resume.")
    optimized: str = Field(..., description="Impact-driven rewrite using action verbs and quantified outcomes.")


class ScanResult(BaseModel):
    overall_score: int = Field(
        ...,
        ge=0,
        le=100,
        description="Resume-to-job-description alignment score from 0 to 100.",
    )
    red_flags: List[str] = Field(
        default_factory=list,
        description="Formatting, clarity, or ATS compliance issues found in the resume.",
    )
    missing_keywords: List[str] = Field(
        default_factory=list,
        description="Critical tools, technologies, frameworks, or role skills missing compared to the JD.",
    )
    bullet_fixes: List[BulletFix] = Field(
        default_factory=list,
        description="Weak resume bullets and their optimized alternatives.",
    )


class ChatResponse(BaseModel):
    reply: str = Field(..., description="Short conversational career coaching reply.")


"""
Schema architecture note:
Pydantic models hard-lock Gemini outputs before React or storage depend on them.
Validation is O(k) in returned fields/list items, with O(k) space for parsed
objects. This keeps the API structured even as we add job matching and chat.
"""
