
from datetime import datetime, timezone
from typing import Optional

from sqlmodel import SQLModel, Field


def utcnow():
    return datetime.now(timezone.utc)


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    full_name: str
    role: str = Field(default="viewer", index=True)
    password_hash: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=utcnow)


class AuditEvent(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    actor_email: str = Field(index=True)
    action: str = Field(index=True)
    target: str
    detail: str = ""
    created_at: datetime = Field(default_factory=utcnow)