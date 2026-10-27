"""Deterministic capacity and dependency aware goal task scheduling."""
from datetime import date, timedelta


def propose_schedule(tasks: list[dict], *, start: date, deadline: date, minutes_per_day: int,
                     working_days: list[int]) -> dict:
    """Return stable task date proposals; completed/blocked tasks are never moved."""
    if minutes_per_day < 1 or not working_days or any(day not in range(7) for day in working_days):
        raise ValueError("Availability must include a positive daily limit and working days.")
    pending = [dict(task) for task in tasks if task.get("status") not in {"completed", "blocked", "archived"}]
    done = {t["id"] for t in tasks if t.get("status") == "completed"}
    for task in pending:
        deps = task.get("dependencies", [])
        if any(dep not in done and not any(item["id"] == dep for item in pending) for dep in deps):
            raise ValueError("A task references an unknown prerequisite.")
    pending.sort(key=lambda t: (-int(t.get("priority", 3)), t.get("order", 0), t["id"]))
    load: dict[date, int] = {}
    scheduled: dict[str, date] = {}
    changes = []
    remaining = pending[:]
    while remaining:
        progressed = False
        for task in remaining[:]:
            deps = task.get("dependencies", [])
            if any(dep not in done and dep not in scheduled for dep in deps):
                continue
            earliest = max([start] + [scheduled[d] + timedelta(days=1) for d in deps if d in scheduled])
            day = earliest
            duration = max(1, int(task.get("duration_minutes", 30)))
            while day <= deadline and (day.weekday() not in working_days or load.get(day, 0) + duration > minutes_per_day):
                day += timedelta(days=1)
            if day <= deadline:
                load[day] = load.get(day, 0) + duration
                scheduled[task["id"]] = day
                if str(task.get("scheduled_date") or "") != day.isoformat():
                    changes.append({"task_id": task["id"], "title": task.get("title", "Task"),
                                    "from": task.get("scheduled_date"), "to": day.isoformat()})
                remaining.remove(task)
                progressed = True
        if not progressed:
            return {"feasible": False, "changes": changes, "unscheduled": [t["id"] for t in remaining],
                    "reason": "Remaining work cannot fit before the deadline within your daily limit and dependencies."}
    return {"feasible": True, "changes": changes, "unscheduled": [], "reason": None}
