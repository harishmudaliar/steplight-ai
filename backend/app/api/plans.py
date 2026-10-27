from typing import Literal

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_active_user
from backend.app.database import get_db
from backend.app.models.task import Task
from backend.app.models.user import User
from backend.app.schemas.task import TaskOut
from backend.app.core.plan_service import apply_plan

router = APIRouter(prefix="/tasks", tags=["AI plans"])


class PlanRequest(BaseModel):
    consent: Literal[True]
    title: str | None = Field(None, min_length=1, max_length=255)
    notes: str | None = Field(None, max_length=2000)
    capacity: Literal["low", "medium", "high"] | None = None


@router.post("/{task_id}/plan", response_model=TaskOut)
def plan_task(task_id: str, payload: PlanRequest,
              if_match: int = Header(..., alias="If-Match"),
              user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == user.id).first()
    if not task:
        raise HTTPException(404, "Task not found.")
    if task.version != if_match:
        raise HTTPException(409, "Task changed. Reload before generating a plan.")
    if payload.title is not None and not payload.title.strip():
        raise HTTPException(422, "Goal must contain non-whitespace characters.")
    return apply_plan(db, task, goal=payload.title.strip() if payload.title else None,
                      notes=payload.notes, capacity=payload.capacity)
