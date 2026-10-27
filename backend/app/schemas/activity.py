from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field


class ActivityEventCreate(BaseModel):
    event_type: Literal["reflection"]
    metadata_json: Optional[str] = Field(None, max_length=2000)


class ActivityEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    event_type: str
    metadata_json: Optional[str]
    created_at: datetime


class ActivityPageOut(BaseModel):
    events: list[ActivityEventOut]
    total: int
    page: int
    page_size: int
    pages: int


class ActivitySummaryOut(BaseModel):
    total_events: int
    step_completions: int
    pauses: int
    resumes: int
    tasks_created: int


class FeedbackCreate(BaseModel):
    task_id: Optional[str] = None
    step_id: Optional[str] = None
    rating: int = Field(..., ge=1, le=5)
    commentary: Optional[str] = Field(None, max_length=2000)


class FeedbackOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    task_id: Optional[str]
    step_id: Optional[str]
    rating: int
    commentary: Optional[str]
    created_at: datetime
