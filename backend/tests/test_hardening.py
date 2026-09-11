import pytest
import io
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_optimistic_concurrency(client: AsyncClient, auth_headers: dict):
    # 1. Create project
    p_resp = await client.post("/api/projects", headers=auth_headers, json={"name": "Concurrency Test"})
    assert p_resp.status_code == 201
    pid = p_resp.json()["id"]

    # 2. Get document revision (initially 1)
    d_resp = await client.get(f"/api/projects/{pid}/document", headers=auth_headers)
    assert d_resp.status_code == 200
    rev = d_resp.json()["revision"]
    assert rev == 1

    # 3. Save with matching expected_revision (succeeds)
    save_ok = await client.put(
        f"/api/projects/{pid}/document",
        headers=auth_headers,
        json={"frames": [{"id": "f1", "name": "S1", "nodes": []}], "expected_revision": 1},
    )
    assert save_ok.status_code == 200
    new_rev = save_ok.json()["revision"]
    assert new_rev == 2

    # 4. Save with stale expected_revision=1 (fails with 409 Conflict)
    save_conflict = await client.put(
        f"/api/projects/{pid}/document",
        headers=auth_headers,
        json={"frames": [{"id": "f1", "name": "S1", "nodes": []}], "expected_revision": 1},
    )
    assert save_conflict.status_code == 409
    detail = save_conflict.json()["detail"]
    assert detail["server_revision"] == 2
    assert detail["expected_revision"] == 1


@pytest.mark.asyncio
async def test_stricter_schema_validation(client: AsyncClient):
    # 1. Unsupported element type "triangle"
    bad_type = {
        "frames": [
            {
                "id": "f1",
                "name": "S1",
                "nodes": [{"id": "n1", "type": "triangle", "x": 10, "y": 10, "width": 50, "height": 50}],
            }
        ]
    }
    r = await client.post("/api/import/low-json/validate", json={"data": bad_type})
    assert r.status_code == 200
    assert r.json()["valid"] is False
    assert any("unsupported type 'triangle'" in e for e in r.json()["errors"])

    # 2. Negative dimensions
    bad_dims = {
        "frames": [
            {
                "id": "f1",
                "name": "S1",
                "nodes": [{"id": "n1", "type": "rectangle", "x": 10, "y": 10, "width": -50, "height": 50}],
            }
        ]
    }
    r2 = await client.post("/api/import/low-json/validate", json={"data": bad_dims})
    assert r2.status_code == 200
    assert r2.json()["valid"] is False
    assert any("negative dimensions" in e for e in r2.json()["errors"])

    # 3. Invalid prototype action
    bad_proto = {
        "frames": [
            {
                "id": "f1",
                "name": "S1",
                "nodes": [{
                    "id": "n1",
                    "type": "button",
                    "x": 10,
                    "y": 10,
                    "width": 100,
                    "height": 40,
                    "prototype": {"action": "magic_teleport", "trigger": "tap"},
                }],
            }
        ]
    }
    r3 = await client.post("/api/import/low-json/validate", json={"data": bad_proto})
    assert r3.status_code == 200
    assert r3.json()["valid"] is False
    assert any("invalid prototype action" in e for e in r3.json()["errors"])


@pytest.mark.asyncio
async def test_project_thumbnail(client: AsyncClient, auth_headers: dict):
    p_resp = await client.post("/api/projects", headers=auth_headers, json={"name": "Thumbnail Project"})
    pid = p_resp.json()["id"]

    thumb_resp = await client.get(f"/api/projects/{pid}/thumbnail")
    assert thumb_resp.status_code == 200
    assert thumb_resp.headers["content-type"] == "image/svg+xml"
    assert b"<svg" in thumb_resp.content


@pytest.mark.asyncio
async def test_orphan_asset_cleanup(client: AsyncClient, auth_headers: dict):
    p_resp = await client.post("/api/projects", headers=auth_headers, json={"name": "Orphan Asset Project"})
    pid = p_resp.json()["id"]

    # Upload an asset not referenced in document
    files = {"file": ("orphan.png", io.BytesIO(b"fake image content"), "image/png")}
    up_resp = await client.post(f"/api/projects/{pid}/assets", headers=auth_headers, files=files)
    assert up_resp.status_code == 201
    asset_id = up_resp.json()["id"]

    # Clean orphans
    clean_resp = await client.post(f"/api/projects/{pid}/assets/cleanup-orphans", headers=auth_headers)
    assert clean_resp.status_code == 200
    res = clean_resp.json()
    assert res["cleaned_count"] >= 1
    assert asset_id in res["cleaned_asset_ids"]


@pytest.mark.asyncio
async def test_agent_hardening(client: AsyncClient):
    s_resp = await client.post("/api/agent/sessions", json={"name": "Hardened Session"})
    sid = s_resp.json()["session_id"]
    token = s_resp.json()["token"]

    # 1. Forbidden / unrecognized action
    r_bad_action = await client.post(
        f"/api/agent/sessions/{sid}/actions",
        headers={"X-LOW-Token": token},
        json={"action": "system_exec_command", "params": {}},
    )
    assert r_bad_action.status_code == 400

    # 2. Prune expired sessions endpoint
    r_prune = await client.delete("/api/agent/sessions/expired")
    assert r_prune.status_code == 200
    assert "pruned_count" in r_prune.json()
