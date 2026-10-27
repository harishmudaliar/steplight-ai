from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class StepCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    reason: Optional[str] = Field(None, max_length=1000)
    estimated_duration: Optional[int] = Field(300, ge=10, le=7200)
    strategy: Optional[str] = Field("first_physical_movement", max_length=100)
    generation_id: Optional[str] = Field(None, min_length=1, max_length=36)
    order: Optional[int] = Field(1, ge=1)


class StepUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    reason: Optional[str] = Field(None, max_length=1000)
    estimated_duration: Optional[int] = Field(None, ge=10, le=7200)
    strategy: Optional[str] = Field(None, max_length=100)
    status: Optional[str] = Field(None, pattern="^(pending|completed|skipped)$")


class StepOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    task_id: str
    order: int
    title: str
    reason: Optional[str]
    instruction: Optional[str] = None
    effort: Optional[str] = None
    research_suggestions: Optional[List[str]] = None
    estimated_duration: int
    strategy: str
    source: Optional[str]
    generation_id: Optional[str]
    status: str
    version: int = 1
    completed_at: Optional[datetime]
    created_at: datetime


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    notes: Optional[str] = Field(None, max_length=2000)
    capacity: Optional[str] = Field("medium", pattern="^(low|medium|high)$")
    steps: Optional[List[StepCreate]] = Field(default_factory=list)

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Task title must contain at least one non-whitespace character.")
        return value


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    notes: Optional[str] = Field(None, max_length=2000)
    capacity: Optional[str] = Field(None, pattern="^(low|medium|high)$")
    status: Optional[str] = Field(None, pattern="^(active|in_progress|paused|completed|archived)$")

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: Optional[str]) -> Optional[str]:
        if value is not None:
            value = value.strip()
            if not value:
                raise ValueError("Task title must contain at least one non-whitespace character.")
        return value

    @field_validator("status")
    @classmethod
    def normalize_legacy_status(cls, value: Optional[str]) -> Optional[str]:
        return "active" if value == "in_progress" else value


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    title: str
    notes: Optional[str]
    original_input: Optional[str] = None
    description: Optional[str] = None
    plan_model: Optional[str] = None
    plan_guidance: bool = False
    capacity: str
    status: str
    version: int = 1
    created_at: datetime
    updated_at: datetime
    steps: List[StepOut] = Field(default_factory=list)


class TaskListOut(BaseModel):
    """Paginated task list wrapper."""
    tasks: List[TaskOut]
    total: int
    page: int
    page_size: int
    pages: int


class TaskCountsOut(BaseModel):
    """Dashboard summary counts scoped to authenticated user."""
    active: int
    paused: int
    completed: int
    archived: int
    total: int


class SuggestedStepOut(BaseModel):
    """A Gemini suggestion, local reviewed-strategy match, or deterministic fallback."""
    title: str
    reason: str
    strategy: str
    estimated_duration: int
    source: Literal["GEMINI", "LOCAL_RAG", "LOCAL_FALLBACK"]
    fallback_notice: str
    retrieval_score: Optional[float] = Field(None, ge=-1.0, le=1.0)
    generation_id: Optional[str] = None
    model: Optional[str] = None
    fallback_reason: Optional[str] = None


class StepFeedbackCreate(BaseModel):
    action: Literal["done", "cant", "another", "rest", "change", "dismiss"]
    step_id: Optional[str] = Field(None, min_length=1, max_length=36)

    @model_validator(mode="after")
    def require_step_for_step_actions(self):
        if self.action in {"done", "cant", "another", "change"} and self.step_id is None:
            raise ValueError(f"step_id is required for the {self.action} action.")
        return self


class StepFeedbackOut(BaseModel):
    action: Literal["done", "cant", "another", "rest", "change", "dismiss"]
    state: Literal["active", "paused", "completed", "change_requested", "dismissed"]
    task_status: str
    task_version: int
    step: Optional[StepOut] = None
    message: str
