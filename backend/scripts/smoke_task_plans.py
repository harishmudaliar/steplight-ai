"""Opt-in live Gemini/API test. Creates a separate verification account and tasks."""
import argparse
import json
from pathlib import Path
import time
import uuid

import httpx

from backend.app.config import settings


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--matrix", action="store_true", help="Test four goals at all three capacities.")
    parser.add_argument("--adaptive", action="store_true", help="Also test live smaller/alternative/adapt operations.")
    parser.add_argument("--output", default="docs/verification/gemini-plan-smoke.json")
    args = parser.parse_args()
    base = f"http://{settings.BACKEND_HOST}:{settings.BACKEND_PORT}{settings.API_PREFIX}"
    results = {"base_url": base, "model": settings.GEMINI_MODEL, "cases": [], "checks": {}}
    goals = ["I need to complete my Python assignment on Decision Trees.",
             "Prepare for my DBMS examination covering SQL, normalization and transactions.",
             "Write a project report about a traffic data engineering pipeline.",
             "Clean and organize my kitchen before cooking dinner."]
    email = f"plan-smoke-{uuid.uuid4().hex[:8]}@example.com"
    password = uuid.uuid4().hex + "!"
    with httpx.Client(base_url=base, timeout=260, trust_env=False) as client:
        registered = client.post("/auth/register", json={"email": email, "password": password, "display_name": "Plan Smoke Test"})
        registered.raise_for_status()
        auth = registered.json()
        client.headers["Authorization"] = "Bearer " + auth["access_token"]
        try:
            plans = []
            for index, goal in enumerate(goals):
                capacities = ["low", "medium", "high"] if args.matrix else [["medium"], ["low"], ["high"], ["medium"]][index]
                for capacity in capacities:
                    task = client.post("/tasks", json={"title": goal, "capacity": capacity}).json()
                    started = time.monotonic()
                    response = client.post(f"/tasks/{task['id']}/plan", headers={"If-Match": str(task["version"])}, json={"consent": True})
                    case = {"goal": goal, "capacity": capacity, "status": response.status_code,
                            "seconds": round(time.monotonic() - started, 1), "task_id": task["id"]}
                    if response.status_code == 200:
                        plan = response.json()
                        assert plan["plan_model"] == settings.GEMINI_MODEL and plan["original_input"] == goal
                        assert all(s["source"] == "GEMINI" and s["instruction"] for s in plan["steps"])
                        assert client.get(f"/tasks/{task['id']}").json() == plan
                        case["plan"] = plan
                        plans.append(plan)
                    else:
                        case["error"] = response.json()
                    results["cases"].append(case)
                    print(json.dumps({k: v for k, v in case.items() if k != "plan"}), flush=True)
                    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
                    Path(args.output).write_text(json.dumps(results, indent=2), encoding="utf-8")
            signatures = [tuple(s["instruction"] for s in p["steps"]) for p in plans]
            results["checks"]["distinct_plans"] = len(signatures) == len(set(signatures))
            if plans:
                task = plans[0]
                path = f"/tasks/{task['id']}"
                def feedback(action, step=None):
                    payload = {"action": action}
                    if step: payload["step_id"] = step["id"]
                    response = client.post(path + "/feedback", headers={"Idempotency-Key": str(uuid.uuid4())}, json=payload)
                    results["checks"][action] = response.status_code
                    print("feedback", action, response.status_code, flush=True)
                    if response.is_error:
                        results["checks"][action + "_error"] = response.json()
                    Path(args.output).write_text(json.dumps(results, indent=2), encoding="utf-8")
                    response.raise_for_status()
                    return response.json()
                completed = task["steps"][0]
                feedback("done", completed)
                if args.adaptive and len(task["steps"]) > 1:
                    smaller = feedback("cant", task["steps"][1])["step"]
                    feedback("another", smaller)
                feedback("rest")
                assert client.get(path).json()["status"] == "paused"
                assert client.patch(path, json={"status": "active"}).status_code == 200
                feedback("dismiss")
                if args.adaptive:
                    latest = client.get(path).json()
                    response = client.post(path + "/plan", headers={"If-Match": str(latest["version"])}, json={"consent": True, "capacity": "low"})
                    results["checks"]["adapt_capacity"] = response.status_code
                    print("adapt capacity", response.status_code, flush=True)
                    response.raise_for_status()
                before = client.get(path).json()
                assert next(s for s in before["steps"] if s["id"] == completed["id"])["status"] == "completed"
                assert client.post("/auth/logout", json={"refresh_token": auth["refresh_token"]}).status_code == 200
                auth = client.post("/auth/login", json={"email": email, "password": password}).json()
                client.headers["Authorization"] = "Bearer " + auth["access_token"]
                assert client.get(path).json() == before
                results["checks"]["logout_login_persistence"] = True
                client.post("/auth/logout", json={"refresh_token": auth["refresh_token"]})
        finally:
            client.post("/auth/logout", json={"refresh_token": auth["refresh_token"]})
            Path(args.output).parent.mkdir(parents=True, exist_ok=True)
            Path(args.output).write_text(json.dumps(results, indent=2), encoding="utf-8")

    Path(args.output).write_text(json.dumps(results, indent=2), encoding="utf-8")
    successes = sum(case["status"] == 200 for case in results["cases"])
    print(f"Live Gemini plans: {successes}/{len(results['cases'])}; details: {args.output}")
    return 0 if successes == len(results["cases"]) and results["checks"].get("distinct_plans") else 1


if __name__ == "__main__":
    raise SystemExit(main())
