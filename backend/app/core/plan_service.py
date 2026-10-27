"""Generation and persistence shared by plan endpoints and feedback transitions."""
from functools import lru_cache
import logging

from fastapi import HTTPException
from sqlalchemy import update

from backend.app.config import settings
from backend.app.models.task import Task, Step
from backend.app.core.gemini_sequencer import GeminiClient, GeminiProviderError, persist_safe_generation_metadata
from backend.app.core.strategy_retrieval import StrategyRetriever, StrategyIndexUnavailable, StrategyModelUnavailable, StrategyIndexIntegrityError, KnowledgeBaseError
from backend.app.core.task_planner import generate_plan

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def retriever():
    return StrategyRetriever(knowledge_base_path=settings.STRATEGY_KB_PATH,
                             index_dir=settings.STRATEGY_INDEX_DIR,
                             minimum_score=settings.STRATEGY_MIN_RELEVANCE_SCORE)


def generate(task, *, goal=None, notes=None, capacity=None, mode="plan", rejected=None):
    goal = goal or task.plan_goal or task.original_input or task.title
    notes = task.notes if notes is None else notes
    capacity = capacity or task.capacity
    history = [{"title": s.title, "instruction": s.instruction or s.title, "status": s.status}
               for s in task.steps if s.status != "pending" or mode != "plan"]
    try:
        strategies = retriever().retrieve(goal + " " + (notes or ""), capacity, top_k=3)
    except (StrategyIndexUnavailable, StrategyModelUnavailable, StrategyIndexIntegrityError, KnowledgeBaseError, OSError):
        strategies = []  # Gemini still authors the entire plan; no local step is substituted.
    client = None
    try:
        client = GeminiClient()
        plan = generate_plan(client, goal=goal, notes=notes or "", capacity=capacity,
                             strategies=strategies, history=history, mode=mode,
                             current_instruction=(rejected.instruction or rejected.title) if rejected else "")
        return plan, client.model, bool(strategies)
    except (GeminiProviderError, ValueError) as error:
        category = error.category if isinstance(error, GeminiProviderError) else "configuration"
        logger.warning("gemini_plan_failed category=%s", category)
        raise HTTPException(503, f"Gemini could not generate a valid plan ({category}). Your saved work is unchanged. Please retry.") from None
    finally:
        if client:
            client.close()


def save_steps(db, task, plan, model, guidance, *, start_order):
    generation_id = persist_safe_generation_metadata(
        db, task_id=task.id, source="GEMINI", model=model, strategy_id=None,
        guard_metadata={"version": "plan-1", "passed": True, "strategy_guidance": guidance},
        input_tokens=None, output_tokens=None, estimated_cost_usd=None, request_id=None,
    )
    saved = []
    for index, item in enumerate(plan.steps):
        step = Step(task_id=task.id, order=start_order + index, title=item.title,
                    instruction=item.instruction, reason=item.why_this_step,
                    estimated_duration=item.estimated_minutes * 60, effort=item.effort,
                    research_suggestions=item.research_suggestions, source="GEMINI",
                    strategy="ai_strategy_guidance" if guidance else "ai_generated",
                    generation_id=generation_id, status="pending")
        db.add(step)
        saved.append(step)
    db.flush()
    return saved


def apply_plan(db, task, *, goal=None, notes=None, capacity=None):
    if task.status in {"completed", "archived"}:
        raise HTTPException(409, "Reopen this task before changing its plan.")
    version = task.version
    plan, model, guidance = generate(task, goal=goal, notes=notes, capacity=capacity)
    changed = db.execute(update(Task).where(Task.id == task.id, Task.version == version).values(
        title=plan.task_title, description=plan.task_description, plan_model=model,
        plan_guidance=guidance, plan_goal=goal or task.plan_goal or task.original_input or task.title,
        original_input=task.original_input or task.title,
        notes=task.notes if notes is None else notes, capacity=capacity or task.capacity,
        version=Task.version + 1,
    ).execution_options(synchronize_session=False))
    if changed.rowcount != 1:
        db.rollback()
        raise HTTPException(409, "Task changed while Gemini was generating. Reload and retry.")
    for step in task.steps:
        if step.status == "pending":
            step.status = "skipped"
            step.version += 1
    save_steps(db, task, plan, model, guidance, start_order=max((s.order for s in task.steps), default=0) + 1)
    db.commit()
    db.expire_all()
    return db.query(Task).filter(Task.id == task.id).one()
