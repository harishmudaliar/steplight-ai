from math import ceil
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.models.activity import ActivityEvent, Feedback
from backend.app.models.task import Step, Task
from backend.app.schemas.activity import (
    ActivityEventOut,
    ActivityEventCreate,
    ActivitySummaryOut,
    FeedbackOut,
    FeedbackCreate,
)
from backend.app.api.deps import get_current_active_user

router = APIRouter(prefix="/activity", tags=["Activity"])


def _owned_activity_query(user_id: str, db: Session):
    return db.query(ActivityEvent).filter(ActivityEvent.user_id == user_id)


def _filter_category(query, category: str):
    if category == "steps":
        return query.filter(ActivityEvent.event_type.like("step_%"))
    if category == "pauses":
        return query.filter(ActivityEvent.event_type.in_(("task_paused", "task_resumed")))
    if category == "tasks":
        return query.filter(ActivityEvent.event_type.like("task_%"))
    return query


@router.get("")
def get_user_activity(
    category: Literal["all", "steps", "pauses", "tasks"] | None = None,
    page: int | None = Query(None, ge=1),
    page_size: int | None = Query(None, ge=1, le=100),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Return the legacy recent list or an explicitly requested filtered page."""
    if category is None and page is None and page_size is None:
        return (
            _owned_activity_query(current_user.id, db)
            .order_by(ActivityEvent.created_at.desc())
            .limit(limit)
            .all()
        )
    selected_category = category or "all"
    selected_page = page or 1
    selected_page_size = page_size or 20
    query = _filter_category(
        _owned_activity_query(current_user.id, db),
        selected_category,
    )
    total = query.count()
    events = (
        query
        .order_by(ActivityEvent.created_at.desc())
        .offset((selected_page - 1) * selected_page_size)
        .limit(selected_page_size)
        .all()
    )
    return {
        "events": events,
        "total": total,
        "page": selected_page,
        "page_size": selected_page_size,
        "pages": ceil(total / selected_page_size) if total else 0,
    }


@router.get("/summary", response_model=ActivitySummaryOut)
def get_activity_summary(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Summarize persisted activity events without streaks or comparative scores."""
    counts = dict(
        db.query(ActivityEvent.event_type, func.count(ActivityEvent.id))
        .filter(ActivityEvent.user_id == current_user.id)
        .group_by(ActivityEvent.event_type)
        .all()
    )
    return {
        "total_events": sum(counts.values()),
        "step_completions": counts.get("step_completed", 0),
        "pauses": counts.get("task_paused", 0),
        "resumes": counts.get("task_resumed", 0),
        "tasks_created": counts.get("task_created", 0),
    }


@router.post("", response_model=ActivityEventOut, status_code=status.HTTP_201_CREATED)
def record_activity_event(
    payload: ActivityEventCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Record an activity event for the authenticated user."""
    event = ActivityEvent(
        user_id=current_user.id,
        event_type=payload.event_type.strip(),
        metadata_json=payload.metadata_json,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.post("/feedback", response_model=FeedbackOut, status_code=status.HTTP_201_CREATED)
def record_feedback(
    payload: FeedbackCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Record compassionate user feedback on a task or micro-step."""
    task = None
    if payload.task_id:
        task = (
            db.query(Task)
            .filter(Task.id == payload.task_id, Task.user_id == current_user.id)
            .first()
        )
        if task is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")

    if payload.step_id:
        step = (
            db.query(Step)
            .join(Task, Step.task_id == Task.id)
            .filter(Step.id == payload.step_id, Task.user_id == current_user.id)
            .first()
        )
        if step is None or (task is not None and step.task_id != task.id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Step not found.")

    feedback = Feedback(
        user_id=current_user.id,
        task_id=task.id if task else payload.task_id,
        step_id=payload.step_id,
        rating=payload.rating,
        commentary=payload.commentary.strip() if payload.commentary else None,
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback
