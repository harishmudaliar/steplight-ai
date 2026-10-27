from datetime import date, timedelta


def _register(client, email):
    response = client.post("/api/auth/register", json={"email": email, "password": "GoalPlanningPassword123"})
    assert response.status_code == 201
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def _goal_payload(**updates):
    return {"title": "Learn data analysis", "description": "Build confidence analyzing a public dataset",
            "outcome": "A short report with three useful findings", "deadline": (date.today()+timedelta(days=30)).isoformat(),
            "skill_level": "beginner", "minutes_per_day": 45, "working_days": [0,1,2,3,4], "capacity": "low",
            "constraints": "Evenings only", **updates}


def test_goal_creation_validation_and_owner_isolation(client):
    owner = _register(client, "goal-owner@steplight.ai")
    other = _register(client, "goal-other@steplight.ai")
    response = client.post("/api/goals", headers=owner, json=_goal_payload())
    assert response.status_code == 200
    goal_id = response.json()["id"]
    assert client.get("/api/goals", headers=owner).json()[0]["id"] == goal_id
    assert client.get(f"/api/goals/{goal_id}", headers=other).status_code == 404
    assert client.post("/api/goals", headers=owner, json=_goal_payload(working_days=[0,0])).status_code == 422
    assert client.post("/api/goals", headers=owner, json=_goal_payload(minutes_per_day=0)).status_code == 422


def test_goal_endpoints_require_authentication(client):
    assert client.get("/api/goals").status_code == 401
    assert client.post("/api/goals", json=_goal_payload()).status_code == 401
