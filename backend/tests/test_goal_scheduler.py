from datetime import date

import pytest

from backend.app.core.goal_scheduler import propose_schedule


def test_schedule_respects_daily_capacity_and_dependencies():
    tasks = [
        {"id": "a", "title": "First", "status": "active", "priority": 3, "duration_minutes": 30, "dependencies": []},
        {"id": "b", "title": "Second", "status": "active", "priority": 5, "duration_minutes": 30, "dependencies": ["a"]},
    ]
    result = propose_schedule(tasks, start=date(2026, 10, 27), deadline=date(2026, 11, 5),
                              minutes_per_day=30, working_days=[0, 1, 2, 3, 4])
    assert result["feasible"] is True
    assert result["changes"] == [
        {"task_id": "a", "title": "First", "from": None, "to": "2026-10-27"},
        {"task_id": "b", "title": "Second", "from": None, "to": "2026-10-28"},
    ]


def test_schedule_preserves_completed_tasks_and_reports_infeasible_work():
    tasks = [
        {"id": "done", "title": "Done", "status": "completed", "duration_minutes": 120, "dependencies": [], "scheduled_date": "2026-10-20"},
        {"id": "next", "title": "Next", "status": "active", "duration_minutes": 60, "dependencies": ["done"]},
    ]
    result = propose_schedule(tasks, start=date(2026, 10, 27), deadline=date(2026, 10, 27),
                              minutes_per_day=30, working_days=[1])
    assert result["feasible"] is False
    assert result["unscheduled"] == ["next"]
    assert all(change["task_id"] != "done" for change in result["changes"])


def test_unknown_prerequisite_is_rejected():
    with pytest.raises(ValueError, match="unknown prerequisite"):
        propose_schedule([{"id": "a", "status": "active", "duration_minutes": 10, "dependencies": ["missing"]}],
                         start=date(2026, 10, 27), deadline=date(2026, 10, 30),
                         minutes_per_day=30, working_days=[0, 1, 2, 3, 4])
