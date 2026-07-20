"""Pydantic schemas for anything user- or AI-supplied. Gate 1 fills this (webhook completion payload)."""

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    version: str
