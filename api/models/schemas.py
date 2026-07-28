"""Pydantic schemas for anything user- or externally-supplied (Stack_Architecture_Plan §6.3)."""

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str
    version: str


class CompleteRequest(BaseModel):
    """Body for POST /api/v1/complete — the webhook that lets IFTTT/Tasker/Zapier finish a habit."""

    token: str = Field(min_length=16, description="the user's per-account webhook token")
    habit_id: str = Field(min_length=1, description="which habit to complete")
    source: str = "webhook"
