from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_active_user
from backend.app.database import get_db
from backend.app.models.activity import ActivityEvent, Feedback, StepFeedbackEvent
from backend.app.models.preference import UserPreference
from backend.app.models.task import StepGeneration, Task
from backend.app.models.user import User


router = APIRouter(prefix="/privacy", tags=["Privacy"])
RETENTION_NOTICE = (
    "Account data and activity are retained while the account exists. "
    "Steplight does not currently enforce an automatic age-based purge. "
    "Account deletion removes associated records from the configured application database."
)


@router.get("/export")
def export_account_data(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Return an account-scoped JSON export without credentials or token material."""
    tasks = (
        db.query(Task)
        .filter(Task.user_id == current_user.id)
        .order_by(Task.created_at.asc(), Task.id.asc())
        .all()
    )
    task_ids = [task.id for task in tasks]
    return {
        "exported_at": datetime.now(timezone.utc),
        "retention": RETENTION_NOTICE,
        "account": {
            "id": current_user.id,
            "email": current_user.email,
            "display_name": current_user.display_name,
            "baseline_capacity": current_user.baseline_capacity,
            "is_active": current_user.is_active,
            "created_at": current_user.created_at,
        },
        "preferences": _preferences_export(db, current_user.id),
        "tasks": [
            {
                "id": task.id,
                "title": task.title,
                "notes": task.notes,
                "capacity": task.capacity,
                "status": task.status,
                "created_at": task.created_at,
                "updated_at": task.updated_at,
                "steps": [
                    {
                        "id": step.id,
                        "order": step.order,
                        "title": step.title,
                        "reason": step.reason,
                        "estimated_duration": step.estimated_duration,
                        "strategy": step.strategy,
                        "source": step.source,
                        "generation_id": step.generation_id,
                        "status": step.status,
                        "completed_at": step.completed_at,
                        "created_at": step.created_at,
                    }
                    for step in task.steps
                ],
            }
            for task in tasks
        ],
        "activity_events": [
            _activity_export(event)
            for event in (
                db.query(ActivityEvent)
                .filter(ActivityEvent.user_id == current_user.id)
                .order_by(ActivityEvent.created_at.asc(), ActivityEvent.id.asc())
                .all()
            )
        ],
        "feedback": [
            {
                "id": item.id,
                "task_id": item.task_id,
                "step_id": item.step_id,
                "rating": item.rating,
                "commentary": item.commentary,
                "created_at": item.created_at,
            }
            for item in (
                db.query(Feedback)
                .filter(Feedback.user_id == current_user.id)
                .order_by(Feedback.created_at.asc(), Feedback.id.asc())
                .all()
            )
        ],
        "step_feedback_events": [
            {
                "id": item.id,
                "task_id": item.task_id,
                "step_id": item.step_id,
                "action": item.action,
                "created_at": item.created_at,
            }
            for item in (
                db.query(StepFeedbackEvent)
                .filter(StepFeedbackEvent.user_id == current_user.id)
                .order_by(StepFeedbackEvent.created_at.asc(), StepFeedbackEvent.id.asc())
                .all()
            )
        ],
        "step_generations": [
            {
                "id": item.id,
                "task_id": item.task_id,
                "source": item.source,
                "model": item.model,
                "strategy_id": item.strategy_id,
                "guard_version": item.guard_version,
                "guard_passed": item.guard_passed,
                "input_tokens": item.input_tokens,
                "output_tokens": item.output_tokens,
                "estimated_cost_usd": item.estimated_cost_usd,
                "created_at": item.created_at,
            }
            for item in (
                db.query(StepGeneration)
                .filter(StepGeneration.task_id.in_(task_ids))
                .order_by(StepGeneration.created_at.asc(), StepGeneration.id.asc())
                .all()
            )
        ] if task_ids else [],
    }


def _preferences_export(db: Session, user_id: str):
    preference = (
        db.query(UserPreference)
        .filter(UserPreference.user_id == user_id)
        .first()
    )
    if preference is None:
        return None
    return {
        "theme": preference.theme,
        "default_duration": preference.default_duration,
        "sound_enabled": preference.sound_enabled,
        "gentle_reminders": preference.gentle_reminders,
        "gemini_personalization_enabled": preference.gemini_personalization_enabled,
        "updated_at": preference.updated_at,
    }


def _activity_export(event: ActivityEvent):
    return {
        "id": event.id,
        "event_type": event.event_type,
        "metadata_json": event.metadata_json,
        "created_at": event.created_at,
    }
