from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class LoginRequest(BaseModel):
    email: str
    password: str

class UserCreate(BaseModel):
    email: str
    full_name: str = Field(min_length=2, max_length=120)
    password: str = Field(min_length=12, max_length=128)
    role: str = "viewer"

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime

class AuditOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    actor_email: str
    action: str
    target: str
    detail: str
    created_at: datetime
