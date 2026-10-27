"""
Deterministic Local Step Sequencer (Fallback Engine)
Provides compassionate, non-overwhelming initial micro-step suggestions
calibrated strictly by capacity (Low / Medium / High).

Explicitly labeled as a local deterministic fallback heuristic until Gemini AI RAG
orchestration connects in Phase 6. Never claims Gemini or external AI generation.
"""

from typing import Dict, Any, Optional


def generate_deterministic_step(
    task_title: str,
    task_notes: Optional[str] = None,
    capacity: str = "medium",
    step_order: int = 1,
) -> Dict[str, Any]:
    """
    Generates a single deterministic micro-step tailored to energy capacity.
    Always maintains one active suggested step at a time.
    """
    norm_cap = capacity.lower() if capacity else "medium"
    clean_title = task_title.strip() if task_title else "this task"

    if norm_cap == "low":
        if step_order == 1:
            return {
                "order": 1,
                "title": f"Clear a 6-inch physical space on your desk or screen for {clean_title}",
                "reason": "Local Fallback • Low Capacity: Reduces visual and tactile sensory overload so you only need to face one manageable spot.",
                "estimated_duration": 30,
                "strategy": "first_physical_movement",
                "status": "pending",
            }
        elif step_order == 2:
            return {
                "order": 2,
                "title": f"Open the single required window, tab, or notebook for {clean_title}",
                "reason": "Local Fallback • Low Capacity: Eliminates startup friction by positioning the tool in front of you with zero pressure to begin working yet.",
                "estimated_duration": 45,
                "strategy": "friction_reduction",
                "status": "pending",
            }
        else:
            return {
                "order": step_order,
                "title": f"Look over the first line or headline of {clean_title} for 15 seconds without editing",
                "reason": "Local Fallback • Low Capacity: Gentle non-demanding visual exposure overcomes freeze response without cognitive exhaustion.",
                "estimated_duration": 60,
                "strategy": "gentle_exposure",
                "status": "pending",
            }

    elif norm_cap == "high":
        if step_order == 1:
            return {
                "order": 1,
                "title": f"Outline the 3 main milestones to accomplish {clean_title}",
                "reason": "Local Fallback • High Capacity: Channels energetic focus into high-level structural clarity before deep work.",
                "estimated_duration": 300,
                "strategy": "structural_scaffolding",
                "status": "pending",
            }
        elif step_order == 2:
            return {
                "order": 2,
                "title": f"Complete an uninterrupted 8-minute sprint on the first milestone of {clean_title}",
                "reason": "Local Fallback • High Capacity: Capitalizes on existing momentum to make substantial headway on core blockers.",
                "estimated_duration": 480,
                "strategy": "momentum_sprint",
                "status": "pending",
            }
        else:
            return {
                "order": step_order,
                "title": f"Review sprint progress on {clean_title} and take a mindful 2-minute restorative pause",
                "reason": "Local Fallback • High Capacity: Protects momentum from overshooting into sudden executive depletion and burnout.",
                "estimated_duration": 120,
                "strategy": "burnout_prevention",
                "status": "pending",
            }

    else:  # medium capacity
        if step_order == 1:
            return {
                "order": 1,
                "title": f"Write down the core starting point of {clean_title} in one single sentence",
                "reason": "Local Fallback • Medium Capacity: Creates a firm mental coordinate without asking for a full outline or commitment.",
                "estimated_duration": 180,
                "strategy": "single_bullet_initiation",
                "status": "pending",
            }
        elif step_order == 2:
            return {
                "order": 2,
                "title": f"Gather the top 2 reference notes or files needed for {clean_title}",
                "reason": "Local Fallback • Medium Capacity: Assembles immediate context so execution remains smooth and distraction-free.",
                "estimated_duration": 240,
                "strategy": "context_scaffolding",
                "status": "pending",
            }
        else:
            return {
                "order": step_order,
                "title": f"Work for 5 minutes on the first chunk of {clean_title}, then celebrate progress",
                "reason": "Local Fallback • Medium Capacity: Delivers focused progress within a safe, timeboxed container.",
                "estimated_duration": 300,
                "strategy": "timeboxed_chunking",
                "status": "pending",
            }
