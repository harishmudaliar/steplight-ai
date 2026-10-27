from datetime import datetime, timezone
import hashlib
import json
import logging
import uuid
from functools import lru_cache
from typing import List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy import func, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.models.task import Task, Step, StepGeneration
from backend.app.models.activity import ActivityEvent, StepFeedbackEvent
from backend.app.models.preference import UserPreference
from backend.app.schemas.task import (
    TaskCreate,
    TaskUpdate,
    TaskOut,
    TaskListOut,
    TaskCountsOut,
    StepCreate,
    StepUpdate,
    StepOut,
    SuggestedStepOut,
    StepFeedbackCreate,
    StepFeedbackOut,
)
from backend.app.api.deps import get_current_active_user
from backend.app.config import settings
from backend.app.core.strategy_retrieval import (
    StrategyIndexUnavailable,
    StrategyModelUnavailable,
    StrategyRetriever,
)
from backend.app.core.gemini_sequencer import (
    GeminiClient,
    GeminiProviderError,
    GUARD_VERSION,
    persist_safe_generation_metadata,
)

router = APIRouter(prefix="/tasks", tags=["Tasks"])
logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _get_strategy_retriever() -> StrategyRetriever:
    return StrategyRetriever(
        knowledge_base_path=settings.STRATEGY_KB_PATH,
        index_dir=settings.STRATEGY_INDEX_DIR,
        minimum_score=settings.STRATEGY_MIN_RELEVANCE_SCORE,
    )

# ──────────────────────────────────────────────────────────────────────────────
# Deterministic local step suggestions — Phase-4 fallback, Gemini not yet wired.
# Clearly labeled LOCAL_FALLBACK so Phase 6 can replace with Gemini call.
# ──────────────────────────────────────────────────────────────────────────────

_LOW_STEPS = [
    ("Open the relevant file or document", "lower_friction", "Opening the file is the only barrier right now."),
    ("Write one sentence about the task", "tiny_commitment", "One sentence anchors you without overwhelm."),
    ("Set a timer for 5 minutes and just look", "time_box", "Timed review removes the fear of open-ended effort."),
    ("Locate three key words in the material", "search_anchor", "Finding anchor words activates recognition memory."),
    ("Write the question you are trying to answer", "clarify_goal", "Clarity reduces cognitive load before you begin."),
]

_MEDIUM_STEPS = [
    ("Read the first section and highlight one key point", "focused_review", "A single highlight keeps you in active recall mode."),
    ("Write a 3-bullet summary of what you know", "knowledge_dump", "Externalising prior knowledge frees working memory."),
    ("Draft an outline with three headings", "structured_scaffold", "Outlines reduce blank-page anxiety for any task."),
    ("Work for 15 minutes on the hardest part first", "hard_first", "Tackling the hardest part first maximises cognitive bandwidth."),
    ("Complete one unit / one page / one module", "unit_completion", "Closure of a single unit provides a natural stopping point."),
]

_HIGH_STEPS = [
    ("Complete a full draft or first pass", "full_draft", "A rough first pass is better than a perfect blank page."),
    ("Work through the entire section without interruption", "deep_work", "Uninterrupted deep work builds flow and momentum."),
    ("Review, revise, and finalise the deliverable", "quality_review", "Iteration after drafting yields the best result."),
    ("Run all tests / checklist items end-to-end", "verification", "Systematic verification closes the loop on quality."),
    ("Prepare and share your completed work", "delivery", "Sharing completes the task loop and reinforces achievement."),
]

def _pick_local_step(title: str, capacity: str, step_index: int = 0) -> dict:
    """Deterministically pick a local fallback step using title hash + index."""
    seed = int(hashlib.md5(title.encode()).hexdigest()[:8], 16)
    bank = {"low": _LOW_STEPS, "medium": _MEDIUM_STEPS, "high": _HIGH_STEPS}.get(
        capacity, _MEDIUM_STEPS
    )
    idx = (seed + step_index) % len(bank)
    step_title, strategy, reason = bank[idx]
    durations = {"low": 90, "medium": 600, "high": 1800}
    return {
        "title": step_title,
        "reason": reason,
        "strategy": strategy,
        "estimated_duration": durations.get(capacity, 300),
        "source": "LOCAL_FALLBACK",
        "fallback_notice": "Suggested step generated locally. Gemini is used only after account opt-in.",
    }


def _log_activity(db: Session, user_id: str, event_type: str, metadata: str | None = None) -> None:
    """Record a non-punitive activity event for the user."""
    event = ActivityEvent(
        user_id=user_id,
        event_type=event_type,
        metadata_json=metadata,
    )
    db.add(event)
    db.flush()


def _activity_metadata(**values: str) -> str:
    return json.dumps(values, separators=(",", ":"))


# ──────────────────────────────────────────────────────────────────────────────
# Task endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/counts", response_model=TaskCountsOut)
def get_task_counts(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Dashboard metric counts — all values scoped strictly to authenticated user.
    Returns counts for active, paused, completed, archived, and total tasks.
    """
    base = db.query(Task).filter(Task.user_id == current_user.id)
    return {
        "active": base.filter(Task.status == "active").count(),
        "paused": base.filter(Task.status == "paused").count(),
        "completed": base.filter(Task.status == "completed").count(),
        "archived": base.filter(Task.status == "archived").count(),
        "total": base.count(),
    }


@router.get("", response_model=TaskListOut)
def get_user_tasks(
    status_filter: Optional[str] = Query(None, alias="status"),
    capacity_filter: Optional[str] = Query(None, alias="capacity"),
    search: Optional[str] = Query(None, description="Full-text search on task title"),
    page: int = Query(1, ge=1, description="1-indexed page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Get paginated tasks belonging strictly to the authenticated user.
    Supports status/capacity filters and title keyword search.
    """
    query = db.query(Task).filter(Task.user_id == current_user.id)

    # Validate status enum to avoid silent misses
    valid_statuses = {"active", "in_progress", "paused", "completed", "archived"}
    if status_filter and status_filter not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"status must be one of: {', '.join(sorted(valid_statuses))}",
        )
    if status_filter == "in_progress":
        status_filter = "active"

    valid_capacities = {"low", "medium", "high"}
    if capacity_filter and capacity_filter not in valid_capacities:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"capacity must be one of: {', '.join(sorted(valid_capacities))}",
        )

    if status_filter:
        query = query.filter(Task.status == status_filter)
    if capacity_filter:
        query = query.filter(Task.capacity == capacity_filter)
    if search and search.strip():
        query = query.filter(Task.title.ilike(f"%{search.strip()}%"))

    total = query.count()
    offset = (page - 1) * page_size
    tasks = query.order_by(Task.created_at.desc(), Task.id.desc()).offset(offset).limit(page_size).all()

    return {
        "tasks": tasks,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": max(1, -(-total // page_size)),  # ceiling division
    }


@router.post("", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(
    payload: TaskCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Create a new task owned by the current authenticated user.
    Validates title length, capacity value, and notes length.
    Logs a task_created activity event.
    """
    task = Task(
        user_id=current_user.id,
        title=payload.title.strip(),
        original_input=payload.title.strip(),
        plan_goal=payload.title.strip(),
        notes=payload.notes.strip() if payload.notes else None,
        capacity=payload.capacity or "medium",
        status="active",
    )
    db.add(task)
    db.flush()

    if payload.steps:
        for idx, step_data in enumerate(payload.steps, start=1):
            step = Step(
                task_id=task.id,
                order=step_data.order if step_data.order else idx,
                title=step_data.title.strip(),
                reason=step_data.reason.strip() if step_data.reason else None,
                estimated_duration=step_data.estimated_duration or 300,
                strategy=step_data.strategy or "first_physical_movement",
                status="pending",
            )
            db.add(step)

    _log_activity(
        db,
        current_user.id,
        "task_created",
        _activity_metadata(task_id=task.id, task_title=task.title, capacity=task.capacity),
    )
    db.commit()
    db.refresh(task)
    return task


@router.get("/{task_id}", response_model=TaskOut)
def get_task_by_id(
    task_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Get task detail with authorization isolation.
    Returns 404 if task does not exist or belongs to another user.
    """
    task = (
        db.query(Task)
        .filter(Task.id == task_id, Task.user_id == current_user.id)
        .first()
    )
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )
    return task


@router.patch("/{task_id}", response_model=TaskOut)
def update_task(
    task_id: str,
    payload: TaskUpdate,
    if_match: Optional[str] = Header(None, alias="If-Match"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Update a task with authorization isolation.
    Logs status transition activity events (task_paused, task_completed, task_resumed).
    """
    task = (
        db.query(Task)
        .filter(Task.id == task_id, Task.user_id == current_user.id)
        .first()
    )
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )

    expected_version = _parse_if_match(if_match, task.version)
    if expected_version != task.version:
        raise _stale_version_error("task")

    if task.plan_model and any(
        value is not None and value != getattr(task, field)
        for field, value in (("title", payload.title), ("notes", payload.notes), ("capacity", payload.capacity))
    ):
        from backend.app.core.plan_service import apply_plan
        return apply_plan(db, task, goal=payload.title if payload.title != task.title else None,
                          notes=payload.notes, capacity=payload.capacity)

    old_status = task.status
    changes = {}
    if payload.title is not None:
        changes["title"] = payload.title.strip()
    if "notes" in payload.model_fields_set:
        changes["notes"] = payload.notes.strip() if payload.notes else None
    if payload.capacity is not None:
        changes["capacity"] = payload.capacity
    if payload.status is not None:
        changes["status"] = payload.status

    if not changes:
        return task

    changed = db.execute(
        update(Task)
        .where(
            Task.id == task.id,
            Task.user_id == current_user.id,
            Task.version == expected_version,
        )
        .values(**changes, version=Task.version + 1, updated_at=func.now())
        .execution_options(synchronize_session=False)
    )
    if changed.rowcount != 1:
        db.rollback()
        raise _stale_version_error("task")

    # Log meaningful status transitions
    if payload.status and payload.status != old_status:
        event_map = {
            "paused": "task_paused",
            "completed": "task_completed",
            "archived": "task_archived",
            "active": "task_resumed",
        }
        event_type = event_map.get(payload.status, "task_updated")
        _log_activity(
            db,
            current_user.id,
            event_type,
            _activity_metadata(
                task_id=task.id,
                task_title=changes.get("title", task.title),
            ),
        )
    elif any(field in payload.model_fields_set for field in ("title", "notes", "capacity")):
        _log_activity(
            db,
            current_user.id,
            "task_updated",
            _activity_metadata(task_id=task.id, task_title=changes.get("title", task.title)),
        )

    db.commit()
    return db.query(Task).filter(Task.id == task.id, Task.user_id == current_user.id).one()


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Delete task with authorization isolation. Logs task_deleted activity event.
    """
    task = (
        db.query(Task)
        .filter(Task.id == task_id, Task.user_id == current_user.id)
        .first()
    )
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )

    _log_activity(
        db,
        current_user.id,
        "task_deleted",
        _activity_metadata(task_id=task.id, task_title=task.title[:40]),
    )
    db.delete(task)
    db.commit()
    return None


# ──────────────────────────────────────────────────────────────────────────────
# Step suggestion — opt-in Gemini, local reviewed retrieval, deterministic fallback.
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/{task_id}/suggest-step", response_model=SuggestedStepOut)
def get_suggested_step(
    task_id: str,
    step_index: int = Query(0, ge=0, le=9, description="Which suggestion to return (0=first)"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Sends task data to Gemini only when the authenticated user has explicitly
    opted in. Prompt text is never persisted in generation metadata.
    """
    task = (
        db.query(Task)
        .filter(Task.id == task_id, Task.user_id == current_user.id)
        .first()
    )
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )

    if task.plan_model:
        pending = next((step for step in task.steps if step.status == "pending"), None)
        if pending is None:
            raise HTTPException(409, "Plan complete. Mark the overall task complete when ready.")
        return {"title": pending.title, "reason": pending.reason or "", "strategy": pending.strategy,
                "estimated_duration": pending.estimated_duration, "source": "GEMINI",
                "fallback_notice": "AI + Strategy Guidance" if task.plan_guidance else "AI Generated",
                "generation_id": pending.generation_id, "model": task.plan_model}

    query_text = f"Task: {task.title}\nContext: {task.notes or ''}\nCapacity: {task.capacity}"
    try:
        matches = _get_strategy_retriever().retrieve(
            query_text,
            task.capacity,
            top_k=settings.STRATEGY_RETRIEVAL_TOP_K,
        )
    except (StrategyIndexUnavailable, StrategyModelUnavailable) as exc:
        logger.warning(
            "Local strategy retrieval unavailable; serving deterministic fallback (%s).",
            type(exc).__name__,
        )
        matches = []

    preference = (
        db.query(UserPreference)
        .filter(UserPreference.user_id == current_user.id)
        .first()
    )
    if preference is None:
        preference = UserPreference(user_id=current_user.id, gemini_personalization_enabled=False)
        db.add(preference)
        db.flush()

    if matches and preference.gemini_personalization_enabled:
        gemini = None
        try:
            gemini = GeminiClient()
            generated = gemini.generate(
                task_title=task.title,
                task_context=task.notes or "",
                capacity=task.capacity,
                candidates=matches,
                preferred_duration_minutes=preference.default_duration,
            )
            generation_id = persist_safe_generation_metadata(
                db,
                task_id=task.id,
                source="GEMINI",
                model=generated.model,
                strategy_id=generated.strategy_id,
                guard_metadata=generated.guard_metadata,
                input_tokens=generated.input_tokens,
                output_tokens=generated.output_tokens,
                estimated_cost_usd=generated.estimated_cost_usd,
                request_id=generated.request_id,
            )
            db.commit()
            return {
                "title": generated.action,
                "reason": generated.why,
                "strategy": generated.strategy_id,
                "estimated_duration": task_api_duration(task.capacity, preference.default_duration),
                "source": "GEMINI",
                "fallback_notice": (
                    "Suggested by Gemini after your opt-in. One local quality check passed; "
                    "please keep only what feels useful."
                ),
                "retrieval_score": matches[0].score,
                "model": generated.model,
                "generation_id": generation_id,
                "fallback_reason": None,
            }
        except (GeminiProviderError, ValueError) as exc:
            failure_category = (
                exc.category if isinstance(exc, GeminiProviderError) else "configuration"
            )
            guard_metadata = {
                "version": GUARD_VERSION,
                "passed": False,
                "reasons": [failure_category],
                "capacity": task.capacity,
            }
            generation_id = persist_safe_generation_metadata(
                db,
                task_id=task.id,
                source="LOCAL_FALLBACK",
                model=settings.GEMINI_MODEL if settings.GEMINI_API_KEY else None,
                strategy_id=matches[0].strategy_id if matches else None,
                guard_metadata=guard_metadata,
                input_tokens=exc.input_tokens if isinstance(exc, GeminiProviderError) else None,
                output_tokens=exc.output_tokens if isinstance(exc, GeminiProviderError) else None,
                estimated_cost_usd=None,
                request_id=None,
                fallback_reason=failure_category,
            )
            db.commit()
            logger.warning(
                "Gemini generation fallback reason=%s task_id=%s; returning deterministic local step.",
                failure_category,
                task.id,
            )
            suggestion = _pick_local_step(task.title, task.capacity, step_index)
            suggestion.update(
                fallback_notice=(
                    "Gemini could not safely provide a step right now. This deterministic local "
                    "suggestion is available instead; you can retry."
                ),
                generation_id=generation_id,
                fallback_reason=failure_category,
                model=settings.GEMINI_MODEL,
            )
            return suggestion
        finally:
            if gemini is not None:
                gemini.close()

    if matches:
        match = matches[0]
        generation_id = persist_safe_generation_metadata(
            db,
            task_id=task.id,
            source="LOCAL_RAG",
            model=None,
            strategy_id=match.strategy_id,
            guard_metadata={
                "version": GUARD_VERSION,
                "passed": True,
                "reasons": [],
                "capacity": task.capacity,
                "retrieval_score": match.score,
            },
            input_tokens=None,
            output_tokens=None,
            estimated_cost_usd=None,
            request_id=None,
            fallback_reason="gemini_consent_not_enabled",
        )
        db.commit()
        return {
            "title": match.sample,
            "reason": match.caution,
            "strategy": match.strategy_id,
            "estimated_duration": {"low": 90, "medium": 600, "high": 1800}[task.capacity],
            "source": "LOCAL_RAG",
            "fallback_notice": (
                "Matched from the local reviewed strategy library. Gemini is only used after "
                "you opt in under Settings."
            ),
            "retrieval_score": match.score,
            "generation_id": generation_id,
            "model": None,
            "fallback_reason": "gemini_consent_not_enabled",
        }
    suggestion = _pick_local_step(task.title, task.capacity, step_index)
    logger.info(
        "step_suggestion_source=LOCAL_FALLBACK reason=no_retrieval_match task_id=%s",
        task.id,
    )
    generation_id = persist_safe_generation_metadata(
        db,
        task_id=task.id,
        source="LOCAL_FALLBACK",
        model=None,
        strategy_id=suggestion["strategy"],
        guard_metadata={
            "version": GUARD_VERSION,
            "passed": True,
            "reasons": [],
            "capacity": task.capacity,
        },
        input_tokens=None,
        output_tokens=None,
        estimated_cost_usd=None,
        request_id=None,
        fallback_reason="no_retrieval_match",
    )
    db.commit()
    suggestion["fallback_notice"] = (
        "No sufficiently relevant local strategy was available. This deterministic suggestion "
        "was generated locally; Gemini is only used after opt-in."
    )
    suggestion["retrieval_score"] = None
    suggestion["generation_id"] = generation_id
    suggestion["model"] = None
    suggestion["fallback_reason"] = "no_retrieval_match"
    return suggestion


def task_api_duration(capacity: str, preferred_duration_minutes: int) -> int:
    """Bound the opt-in duration preference to the supported one-step range."""
    capacity_default = {"low": 90, "medium": 600, "high": 1800}[capacity]
    return min(max(preferred_duration_minutes * 60, 10), capacity_default * 2)


# ──────────────────────────────────────────────────────────────────────────────
# Adaptive feedback state machine
# ──────────────────────────────────────────────────────────────────────────────

_SMALLER_ACTIONS = (
    "Open the place where this task happens; no changes are needed yet.",
    "Find the one item or file related to this task, then stop.",
    "Write down one word connected to this task.",
    "Move one item needed for this task within reach.",
    "Read the task title once and notice its first physical action.",
    "Go to the place where this task could happen; nothing else is required.",
    "Choose one tiny part of this task without starting it yet.",
    "Make one small change that takes less than a minute.",
)


def _make_smaller_step(db: Session, task: Task, rejected_step: Step) -> Step:
    recent = (
        db.query(StepFeedbackEvent)
        .filter(
            StepFeedbackEvent.user_id == task.user_id,
            StepFeedbackEvent.task_id == task.id,
            StepFeedbackEvent.action == "cant",
        )
        .order_by(StepFeedbackEvent.created_at.desc(), StepFeedbackEvent.id.desc())
        .limit(5)
        .all()
    )
    recently_offered = {rejected_step.title}
    for feedback in recent:
        try:
            response = json.loads(feedback.response_json)
        except json.JSONDecodeError:
            logger.warning("Ignoring malformed stored feedback response id=%s", feedback.id)
            continue
        if response.get("step"):
            recently_offered.add(response["step"].get("title", ""))

    suggestion = next(
        (title for title in _SMALLER_ACTIONS if title not in recently_offered),
        "Pause and choose any one physical item connected to the task.",
    )
    step = Step(
        task_id=task.id,
        order=max((existing.order for existing in task.steps), default=0) + 1,
        title=suggestion,
        reason=(
            "You said the previous step felt too large, so this is a smaller optional action. "
            "It was generated locally from recent feedback; no AI request was needed."
        ),
        estimated_duration=15,
        strategy="adaptive_smaller_step",
        source="LOCAL_FALLBACK",
        status="pending",
    )
    db.add(step)
    db.flush()
    db.refresh(step)
    return step


@router.post(
    "/{task_id}/feedback",
    response_model=StepFeedbackOut,
)
def submit_step_feedback(
    task_id: str,
    payload: StepFeedbackCreate,
    idempotency_key: str = Header(..., alias="Idempotency-Key", min_length=8, max_length=128),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Apply one idempotent transition in the task/step feedback state machine."""
    fingerprint = hashlib.sha256(
        f"{task_id}:{payload.action}:{payload.step_id or ''}".encode("utf-8")
    ).hexdigest()
    prior = (
        db.query(StepFeedbackEvent)
        .filter(
            StepFeedbackEvent.user_id == current_user.id,
            StepFeedbackEvent.idempotency_key == idempotency_key,
        )
        .first()
    )
    if prior:
        if prior.request_fingerprint != fingerprint:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This idempotency key was already used for a different action.",
            )
        return json.loads(prior.response_json)

    task = (
        db.query(Task)
        .filter(Task.id == task_id, Task.user_id == current_user.id)
        .with_for_update()
        .first()
    )
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")
    concurrent_prior = (
        db.query(StepFeedbackEvent)
        .filter(
            StepFeedbackEvent.user_id == current_user.id,
            StepFeedbackEvent.idempotency_key == idempotency_key,
        )
        .first()
    )
    if concurrent_prior:
        if concurrent_prior.request_fingerprint != fingerprint:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This idempotency key was already used for a different action.",
            )
        return json.loads(concurrent_prior.response_json)
    if payload.action != "dismiss" and task.status in {"completed", "archived"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This task is no longer active. You can still dismiss this screen.",
        )

    step = None
    if payload.step_id:
        step = (
            db.query(Step)
            .filter(Step.id == payload.step_id, Step.task_id == task.id)
            .first()
        )
        if not step:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Step not found.")

    replacement = None
    if task.plan_model and payload.action in {"cant", "another"}:
        if step is None or step.status != "pending":
            raise HTTPException(409, "This step is no longer pending. Reload the task.")
        from backend.app.core.plan_service import generate
        replacement = generate(task, mode=payload.action, rejected=step)
    if payload.action == "another" and not task.plan_model:
        raise HTTPException(409, "Generate an AI plan before requesting an alternative.")

    resolved_step = None
    if payload.action in {"done", "cant", "another", "change"} and not (task.plan_model and payload.action == "change"):
        if step is None or step.status != "pending":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This step is no longer pending. Refresh to see the current task state.",
            )
        new_step_status = "completed" if payload.action == "done" else "skipped"
        completed_at = datetime.now(timezone.utc) if payload.action == "done" else None
        transition = db.execute(
            update(Step)
            .where(Step.id == step.id, Step.task_id == task.id, Step.status == "pending")
            .values(status=new_step_status, completed_at=completed_at, version=Step.version + 1)
            .execution_options(synchronize_session=False)
        )
        if transition.rowcount != 1:
            db.rollback()
            concurrent_prior = (
                db.query(StepFeedbackEvent)
                .filter(
                    StepFeedbackEvent.user_id == current_user.id,
                    StepFeedbackEvent.idempotency_key == idempotency_key,
                )
                .first()
            )
            if concurrent_prior and concurrent_prior.request_fingerprint == fingerprint:
                return json.loads(concurrent_prior.response_json)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This step was already updated. Refresh to see the current task state.",
            )
        step.status = new_step_status
        step.completed_at = completed_at
        step.version += 1
        resolved_step = step

    if payload.action == "rest":
        task.status = "paused"
        task.version += 1
        state = "paused"
        message = "Your place is saved. Resume whenever it feels right."
        _log_activity(
            db,
            current_user.id,
            "task_paused",
            _activity_metadata(task_id=task.id, step_id=payload.step_id or ""),
        )
    elif payload.action in {"cant", "another"}:
        if replacement:
            from backend.app.core.plan_service import save_steps
            plan, model, guidance = replacement
            for upcoming in task.steps:
                if upcoming.order > step.order:
                    upcoming.order += len(plan.steps)
                    upcoming.version += 1
            resolved_step = save_steps(db, task, plan, model, guidance, start_order=step.order + 1)[0]
        else:
            resolved_step = _make_smaller_step(db, task, step)
        state = "active"
        message = "That step was set aside. Here is a smaller optional action."
        _log_activity(
            db,
            current_user.id,
            "step_made_smaller",
            _activity_metadata(task_id=task.id, step_id=step.id),
        )
    elif payload.action == "done":
        state = "completed"
        message = "Step complete. Let's find one next step."
        _log_activity(
            db,
            current_user.id,
            "step_completed",
            _activity_metadata(task_id=task.id, step_id=step.id),
        )
    elif payload.action == "change":
        state = "change_requested"
        message = "This step was set aside. Adjust the task or capacity, then get a fresh suggestion."
        _log_activity(
            db,
            current_user.id,
            "task_change_requested",
            _activity_metadata(task_id=task.id, step_id=step.id),
        )
    else:
        state = "dismissed"
        message = "Closed without changing your task or recording completion."
        _log_activity(
            db,
            current_user.id,
            "feedback_dismissed",
            _activity_metadata(task_id=task.id, step_id=payload.step_id or ""),
        )

    if task.plan_model and payload.action not in {"rest", "dismiss"}:
        task.version += 1
    result = StepFeedbackOut(
        action=payload.action,
        state=state,
        task_status=task.status,
        task_version=task.version,
        step=resolved_step,
        message=message,
    )
    serialized_result = result.model_dump_json()
    db.add(
        StepFeedbackEvent(
            user_id=current_user.id,
            task_id=task.id,
            step_id=payload.step_id,
            idempotency_key=idempotency_key,
            request_fingerprint=fingerprint,
            action=payload.action,
            response_json=serialized_result,
        )
    )
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        concurrent = (
            db.query(StepFeedbackEvent)
            .filter(
                StepFeedbackEvent.user_id == current_user.id,
                StepFeedbackEvent.idempotency_key == idempotency_key,
            )
            .first()
        )
        if concurrent and concurrent.request_fingerprint == fingerprint:
            return json.loads(concurrent.response_json)
        if concurrent:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This idempotency key was already used for a different action.",
            )
        raise
    return result


# ──────────────────────────────────────────────────────────────────────────────
# Step CRUD
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/{task_id}/steps", response_model=StepOut, status_code=status.HTTP_201_CREATED)
def add_step_to_task(
    task_id: str,
    payload: StepCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Add step to task, verifying task ownership.
    """
    task = (
        db.query(Task)
        .filter(Task.id == task_id, Task.user_id == current_user.id)
        .first()
    )
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )

    step = Step(
        task_id=task.id,
        order=payload.order or (len(task.steps) + 1),
        title=payload.title.strip(),
        reason=payload.reason.strip() if payload.reason else None,
        estimated_duration=payload.estimated_duration or 300,
        strategy=payload.strategy or "first_physical_movement",
        source=None,
        status="pending",
    )
    if payload.generation_id:
        generation = (
            db.query(StepGeneration)
            .filter(
                StepGeneration.id == payload.generation_id,
                StepGeneration.task_id == task.id,
            )
            .first()
        )
        if generation is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Step suggestion attribution not found.",
            )
        step.source = generation.source
        step.generation_id = generation.id
        step.strategy = generation.strategy_id or step.strategy
    db.add(step)
    _log_activity(
        db,
        current_user.id,
        "step_added",
        _activity_metadata(
            task_id=task.id,
            task_title=task.title,
            step_title=step.title,
            source=step.source or "",
            strategy=step.strategy,
            generation_id=step.generation_id or "",
        ),
    )
    db.commit()
    db.refresh(step)
    return step


@router.patch("/{task_id}/steps/{step_id}", response_model=StepOut)
def update_step(
    task_id: str,
    step_id: str,
    payload: StepUpdate,
    if_match: Optional[str] = Header(None, alias="If-Match"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Update step, enforcing parent task user ownership.
    Logs step_completed activity event when status transitions to completed.
    """
    task = (
        db.query(Task)
        .filter(Task.id == task_id, Task.user_id == current_user.id)
        .first()
    )
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )

    step = (
        db.query(Step)
        .filter(Step.id == step_id, Step.task_id == task.id)
        .first()
    )
    if not step:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Step not found.",
        )

    expected_version = _parse_if_match(if_match, step.version)
    if expected_version != step.version:
        raise _stale_version_error("step")
    if payload.status == "completed" and step.status == "skipped":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A step set aside cannot be marked complete.",
        )

    changes = {}
    if payload.title is not None:
        changes["title"] = payload.title.strip()
    if payload.reason is not None:
        changes["reason"] = payload.reason.strip() if payload.reason else None
    if payload.estimated_duration is not None:
        changes["estimated_duration"] = payload.estimated_duration
    if payload.strategy is not None:
        changes["strategy"] = payload.strategy
    if payload.status is not None:
        changes["status"] = payload.status
        changes["completed_at"] = (
            datetime.now(timezone.utc)
            if payload.status == "completed" and step.status == "pending"
            else step.completed_at if payload.status == "completed" else None
        )
    if not changes:
        return step

    changed = db.execute(
        update(Step)
        .where(
            Step.id == step.id,
            Step.task_id == task.id,
            Step.version == expected_version,
        )
        .values(**changes, version=Step.version + 1)
        .execution_options(synchronize_session=False)
    )
    if changed.rowcount != 1:
        db.rollback()
        raise _stale_version_error("step")

    if task.plan_model:
        db.execute(update(Task).where(Task.id == task.id).values(version=Task.version + 1))
    if payload.status == "completed" and step.status == "pending":
        _log_activity(
            db,
            current_user.id,
            "step_completed",
            _activity_metadata(
                task_id=task.id,
                task_title=task.title,
                step_id=step.id,
                step_title=changes.get("title", step.title),
            ),
        )

    db.commit()
    return db.query(Step).filter(Step.id == step.id, Step.task_id == task.id).one()


def _parse_if_match(value: Optional[str], fallback_version: int) -> int:
    if value is None:
        return fallback_version
    candidate = value.strip()
    if candidate.startswith("W/"):
        candidate = candidate[2:].strip()
    candidate = candidate.strip('"')
    try:
        version = int(candidate)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="If-Match must contain a numeric record version.",
        ) from exc
    if version < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="If-Match must contain a positive record version.",
        )
    return version


def _stale_version_error(record_type: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=f"This {record_type} changed on another device. Reload the latest version before saving.",
    )


@router.delete("/{task_id}/steps/{step_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_step(
    task_id: str,
    step_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Delete a step from a task, enforcing parent task user ownership.
    """
    task = (
        db.query(Task)
        .filter(Task.id == task_id, Task.user_id == current_user.id)
        .first()
    )
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )

    step = (
        db.query(Step)
        .filter(Step.id == step_id, Step.task_id == task.id)
        .first()
    )
    if not step:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Step not found.",
        )

    _log_activity(
        db,
        current_user.id,
        "step_deleted",
        _activity_metadata(task_id=task.id, task_title=task.title, step_title=step.title),
    )
    db.delete(step)
    db.commit()
    return None
