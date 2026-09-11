import pytest
from httpx import AsyncClient
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from app.models.agent import AgentSession
from app.core.database import AsyncSessionLocal


@pytest.mark.asyncio
async def test_agent_connect_flow(client: AsyncClient):
    # 1. Schema
    schema_resp = await client.get("/api/agent/schema")
    assert schema_resp.status_code == 200
    schema = schema_resp.json()
    assert "actions" in schema
    assert any(a["action"] == "add_element" for a in schema["actions"])

    # 2. Create Session
    create_resp = await client.post(
        "/api/agent/sessions",
        json={"name": "Test Agent Session"},
    )
    assert create_resp.status_code == 200
    sess = create_resp.json()
    sid = sess["session_id"]
    token = sess["token"]
    assert token is not None
    assert sess["seq"] == 0
    assert len(sess["frames"]) >= 1
    screen_id = sess["frames"][0]["id"]

    # 3. Get Session info
    info_resp = await client.get(f"/api/agent/sessions/{sid}")
    assert info_resp.status_code == 200
    assert info_resp.json()["id"] == sid

    # 4. Action: add_element with valid token
    add_el_resp = await client.post(
        f"/api/agent/sessions/{sid}/actions",
        headers={"X-LOW-Token": token},
        json={
            "action": "add_element",
            "params": {
                "screenId": screen_id,
                "element": {
                    "type": "button",
                    "name": "Submit Button",
                    "text": "Submit",
                    "x": 24,
                    "y": 500,
                    "width": 342,
                    "height": 50,
                },
            },
        },
    )
    assert add_el_resp.status_code == 200
    res = add_el_resp.json()
    assert res["ok"] is True
    assert res["seq"] == 1
    element_id = res["result"]["elementId"]

    # 5. Action: link_prototype
    link_resp = await client.post(
        f"/api/agent/sessions/{sid}/actions",
        headers={"X-LOW-Token": token},
        json={
            "action": "link_prototype",
            "params": {
                "screenId": screen_id,
                "elementId": element_id,
                "target": screen_id,
                "trigger": "tap",
                "action": "navigate",
                "transition": "slide",
            },
        },
    )
    assert link_resp.status_code == 200
    assert link_resp.json()["ok"] is True
    assert link_resp.json()["seq"] == 2

    # 6. Action with invalid token should fail (401)
    bad_token_resp = await client.post(
        f"/api/agent/sessions/{sid}/actions",
        headers={"X-LOW-Token": "invalid_fake_token"},
        json={"action": "add_element", "params": {"screenId": screen_id}},
    )
    assert bad_token_resp.status_code == 401

    # 7. Action with missing token should fail (401)
    no_token_resp = await client.post(
        f"/api/agent/sessions/{sid}/actions",
        json={"action": "add_element", "params": {"screenId": screen_id}},
    )
    assert no_token_resp.status_code == 401

    # 8. Check events
    events_resp = await client.get(f"/api/agent/sessions/{sid}/events")
    assert events_resp.status_code == 200
    ev_data = events_resp.json()
    assert ev_data["seq"] == 2
    assert len(ev_data["events"]) == 2
    assert ev_data["events"][0]["action"] == "add_element"
    assert ev_data["events"][1]["action"] == "link_prototype"


@pytest.mark.asyncio
async def test_agent_session_presets_and_scopes(client: AsyncClient):
    # Create with Read Only preset
    resp = await client.post(
        "/api/agent/sessions",
        json={"name": "Read Only Agent", "preset": "read_only"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["preset"] == "read_only"
    assert data["scopes"] == ["read_document"]

    # Create with custom scopes
    resp2 = await client.post(
        "/api/agent/sessions",
        json={"name": "Custom Agent", "scopes": ["read_document", "create_screen"]},
    )
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert set(data2["scopes"]) == {"read_document", "create_screen"}


@pytest.mark.asyncio
async def test_read_only_scope_blocks_mutations(client: AsyncClient):
    resp = await client.post(
        "/api/agent/sessions",
        json={"name": "Read Only", "preset": "read_only"},
    )
    data = resp.json()
    sid = data["session_id"]
    token = data["token"]
    screen_id = data["frames"][0]["id"]

    # Read operation allowed
    read_resp = await client.post(
        f"/api/agent/sessions/{sid}/actions",
        headers={"X-LOW-Token": token},
        json={"action": "get_document", "params": {}},
    )
    assert read_resp.status_code == 200

    # Mutating operation blocked with 403
    write_resp = await client.post(
        f"/api/agent/sessions/{sid}/actions",
        headers={"X-LOW-Token": token},
        json={
            "action": "add_element",
            "params": {"screenId": screen_id, "element": {"type": "button", "text": "Click"}},
        },
    )
    assert write_resp.status_code == 403
    assert "lacks required permission scope" in write_resp.json()["detail"]


@pytest.mark.asyncio
async def test_revoke_session_rejects_actions(client: AsyncClient):
    create_resp = await client.post(
        "/api/agent/sessions",
        json={"name": "To Revoke"},
    )
    data = create_resp.json()
    sid = data["session_id"]
    token = data["token"]
    screen_id = data["frames"][0]["id"]

    # Action succeeds before revocation
    act1 = await client.post(
        f"/api/agent/sessions/{sid}/actions",
        headers={"X-LOW-Token": token},
        json={"action": "add_element", "params": {"screenId": screen_id, "element": {"type": "text", "text": "Hi"}}},
    )
    assert act1.status_code == 200

    # Revoke session
    rev_resp = await client.post(f"/api/agent/sessions/{sid}/revoke")
    assert rev_resp.status_code == 200
    assert rev_resp.json()["status"] == "revoked"

    # Subsequent action rejected with 403
    act2 = await client.post(
        f"/api/agent/sessions/{sid}/actions",
        headers={"X-LOW-Token": token},
        json={"action": "add_element", "params": {"screenId": screen_id, "element": {"type": "text", "text": "Bye"}}},
    )
    assert act2.status_code == 403
    assert "revoked" in act2.json()["detail"].lower()


@pytest.mark.asyncio
async def test_expired_session_rejected(client: AsyncClient):
    create_resp = await client.post(
        "/api/agent/sessions",
        json={"name": "To Expire"},
    )
    data = create_resp.json()
    sid = data["session_id"]
    token = data["token"]
    screen_id = data["frames"][0]["id"]

    # Set expires_at in the past
    async with AsyncSessionLocal() as db:
        stmt = select(AgentSession).where(AgentSession.id == sid)
        res = await db.execute(stmt)
        sess = res.scalar_one()
        sess.expires_at = datetime.now(timezone.utc) - timedelta(hours=2)
        await db.commit()

    # Action must be rejected with 401
    act_resp = await client.post(
        f"/api/agent/sessions/{sid}/actions",
        headers={"X-LOW-Token": token},
        json={"action": "add_element", "params": {"screenId": screen_id, "element": {"type": "text", "text": "Late"}}},
    )
    assert act_resp.status_code == 401
    assert "expired" in act_resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_instructions_endpoint_no_token_leak(client: AsyncClient):
    create_resp = await client.post(
        "/api/agent/sessions",
        json={"name": "Instructions Test", "preset": "design_assistant"},
    )
    data = create_resp.json()
    sid = data["session_id"]

    inst_resp = await client.get(f"/api/agent/sessions/{sid}/instructions")
    assert inst_resp.status_code == 200
    inst = inst_resp.json()
    assert inst["sessionId"] == sid
    assert inst["authHeader"] == "X-LOW-Token"
    assert "curl" in inst["curlExample"].lower()
    assert "promptText" in inst
    # Verify no token hash is leaked
    assert "token_hash" not in str(inst).lower()
    assert "argon2" not in str(inst).lower()
    assert "sha256" not in str(inst).lower()


@pytest.mark.asyncio
async def test_dry_run_mode_does_not_mutate_document(client: AsyncClient):
    create_resp = await client.post(
        "/api/agent/sessions",
        json={"name": "Dry Run Test"},
    )
    data = create_resp.json()
    sid = data["session_id"]
    token = data["token"]
    screen_id = data["frames"][0]["id"]

    # Execute with dryRun = True
    dry_resp = await client.post(
        f"/api/agent/sessions/{sid}/actions",
        headers={"X-LOW-Token": token},
        json={
            "action": "add_element",
            "dryRun": True,
            "params": {
                "screenId": screen_id,
                "element": {"type": "button", "name": "Preview Button", "text": "Simulated", "x": 10, "y": 10},
            },
        },
    )
    assert dry_resp.status_code == 200
    dry_data = dry_resp.json()
    assert dry_data["dryRun"] is True
    assert dry_data["seq"] == 0
    # Preview contains the element
    preview_screen = next(f for f in dry_data["frames"] if f["id"] == screen_id)
    assert any(n["name"] == "Preview Button" for n in preview_screen["nodes"])

    # Verify actual document in DB is unchanged
    doc_resp = await client.get(f"/api/agent/sessions/{sid}/document")
    assert doc_resp.status_code == 200
    actual_doc = doc_resp.json()
    assert actual_doc["seq"] == 0
    actual_screen = next(f for f in actual_doc["frames"] if f["id"] == screen_id)
    assert not any(n["name"] == "Preview Button" for n in actual_screen["nodes"])


@pytest.mark.asyncio
async def test_batch_update_atomic_success(client: AsyncClient):
    create_resp = await client.post(
        "/api/agent/sessions",
        json={"name": "Batch Test"},
    )
    data = create_resp.json()
    sid = data["session_id"]
    token = data["token"]
    screen_id = data["frames"][0]["id"]

    batch_resp = await client.post(
        f"/api/agent/sessions/{sid}/actions",
        headers={"X-LOW-Token": token},
        json={
            "action": "batch_update",
            "params": {
                "operations": [
                    {"action": "create_screen", "params": {"name": "Screen B"}},
                    {"action": "add_element", "params": {"screenId": screen_id, "element": {"type": "input", "text": "Search"}}},
                ]
            },
        },
    )
    assert batch_resp.status_code == 200
    res = batch_resp.json()
    assert res["ok"] is True
    assert res["seq"] == 1
    assert len(res["frames"]) == 2  # Original + Screen B


@pytest.mark.asyncio
async def test_batch_update_atomic_rollback(client: AsyncClient):
    create_resp = await client.post(
        "/api/agent/sessions",
        json={"name": "Batch Rollback Test"},
    )
    data = create_resp.json()
    sid = data["session_id"]
    token = data["token"]
    screen_id = data["frames"][0]["id"]

    # Operation 1 is valid, but operation 2 targets nonexistent screen
    batch_resp = await client.post(
        f"/api/agent/sessions/{sid}/actions",
        headers={"X-LOW-Token": token},
        json={
            "action": "batch_update",
            "params": {
                "operations": [
                    {"action": "create_screen", "params": {"name": "Screen Fail"}},
                    {"action": "add_element", "params": {"screenId": "invalid_nonexistent_screen", "element": {"type": "button"}}},
                ]
            },
        },
    )
    assert batch_resp.status_code == 400
    assert "screen not found" in batch_resp.json()["detail"]

    # Verify no screens were created
    doc_resp = await client.get(f"/api/agent/sessions/{sid}/document")
    doc_data = doc_resp.json()
    assert doc_data["seq"] == 0
    assert len(doc_data["frames"]) == 1


@pytest.mark.asyncio
async def test_batch_update_limit_exceeded(client: AsyncClient):
    create_resp = await client.post("/api/agent/sessions", json={"name": "Batch Limit"})
    data = create_resp.json()
    sid = data["session_id"]
    token = data["token"]

    # 26 operations exceeds maximum of 25
    ops = [{"action": "list_screens", "params": {}} for _ in range(26)]
    resp = await client.post(
        f"/api/agent/sessions/{sid}/actions",
        headers={"X-LOW-Token": token},
        json={"action": "batch_update", "params": {"operations": ops}},
    )
    assert resp.status_code == 400
    assert "exceed maximum of 25" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_undo_last_agent_change(client: AsyncClient):
    create_resp = await client.post("/api/agent/sessions", json={"name": "Undo Test"})
    data = create_resp.json()
    sid = data["session_id"]
    token = data["token"]
    screen_id = data["frames"][0]["id"]

    # 1. Mutate
    add_resp = await client.post(
        f"/api/agent/sessions/{sid}/actions",
        headers={"X-LOW-Token": token},
        json={
            "action": "add_element",
            "params": {"screenId": screen_id, "element": {"type": "button", "name": "Undo Me", "text": "Undo Me"}},
        },
    )
    assert add_resp.status_code == 200

    # 2. Undo via session endpoint
    undo_resp = await client.post(f"/api/agent/sessions/{sid}/undo-last")
    assert undo_resp.status_code == 200
    undo_data = undo_resp.json()
    assert undo_data["ok"] is True
    assert undo_data["action"] == "add_element"
    # Verify node is removed from current doc
    screen = next(f for f in undo_data["frames"] if f["id"] == screen_id)
    assert not any(n["name"] == "Undo Me" for n in screen["nodes"])


@pytest.mark.asyncio
async def test_expanded_actions(client: AsyncClient):
    create_resp = await client.post("/api/agent/sessions", json={"name": "Expanded Actions"})
    data = create_resp.json()
    sid = data["session_id"]
    token = data["token"]
    screen_id = data["frames"][0]["id"]

    # Add initial element
    add_resp = await client.post(
        f"/api/agent/sessions/{sid}/actions",
        headers={"X-LOW-Token": token},
        json={
            "action": "add_element",
            "params": {"screenId": screen_id, "element": {"type": "rectangle", "name": "Box", "width": 100, "height": 50}},
        },
    )
    eid = add_resp.json()["result"]["elementId"]

    # Resize element
    resize_resp = await client.post(
        f"/api/agent/sessions/{sid}/actions",
        headers={"X-LOW-Token": token},
        json={
            "action": "resize_element",
            "params": {"screenId": screen_id, "elementId": eid, "width": 150, "height": 80},
        },
    )
    assert resize_resp.status_code == 200
    assert resize_resp.json()["result"]["width"] == 150
    assert resize_resp.json()["result"]["height"] == 80

    # Duplicate element
    dup_el_resp = await client.post(
        f"/api/agent/sessions/{sid}/actions",
        headers={"X-LOW-Token": token},
        json={
            "action": "duplicate_element",
            "params": {"screenId": screen_id, "elementId": eid, "offsetX": 30, "offsetY": 40},
        },
    )
    assert dup_el_resp.status_code == 200
    dup_eid = dup_el_resp.json()["result"]["elementId"]
    assert dup_eid != eid

    # Duplicate screen
    dup_screen_resp = await client.post(
        f"/api/agent/sessions/{sid}/actions",
        headers={"X-LOW-Token": token},
        json={
            "action": "duplicate_screen",
            "params": {"screenId": screen_id, "name": "Duplicated Screen"},
        },
    )
    assert dup_screen_resp.status_code == 200
    assert dup_screen_resp.json()["result"]["name"] == "Duplicated Screen"


@pytest.mark.asyncio
async def test_agent_ai_import_create_and_apply_draft(client: AsyncClient):
    create_resp = await client.post("/api/agent/sessions", json={"name": "AI Agent Test"})
    data = create_resp.json()
    sid = data["session_id"]
    token = data["token"]

    # Create AI draft via agent action
    create_draft_resp = await client.post(
        f"/api/agent/sessions/{sid}/actions",
        headers={"X-LOW-Token": token},
        json={
            "action": "create_ai_draft",
            "params": {
                "resultType": "screen",
                "prompt": "Create login screen",
                "provider": "mock",
            },
        },
    )
    assert create_draft_resp.status_code == 200
    draft_id = create_draft_resp.json()["result"]["draftId"]
    assert draft_id.startswith("aid_")

    # Apply AI draft
    apply_resp = await client.post(
        f"/api/agent/sessions/{sid}/actions",
        headers={"X-LOW-Token": token},
        json={
            "action": "apply_ai_draft",
            "params": {"draftId": draft_id},
        },
    )
    assert apply_resp.status_code == 200
    assert apply_resp.json()["result"]["appliedFrames"] >= 1


@pytest.mark.asyncio
async def test_unknown_action_rejected(client: AsyncClient):
    create_resp = await client.post("/api/agent/sessions", json={"name": "Unknown Action"})
    data = create_resp.json()
    sid = data["session_id"]
    token = data["token"]

    resp = await client.post(
        f"/api/agent/sessions/{sid}/actions",
        headers={"X-LOW-Token": token},
        json={"action": "nonexistent_danger_action", "params": {}},
    )
    assert resp.status_code == 400 or resp.status_code == 403


@pytest.mark.asyncio
async def test_payload_too_large_rejected(client: AsyncClient):
    create_resp = await client.post("/api/agent/sessions", json={"name": "Large Payload"})
    data = create_resp.json()
    sid = data["session_id"]
    token = data["token"]

    # Create payload > 1MB
    large_str = "x" * (1024 * 1024 + 10)
    resp = await client.post(
        f"/api/agent/sessions/{sid}/actions",
        headers={"X-LOW-Token": token},
        json={"action": "add_element", "params": {"data": large_str}},
    )
    assert resp.status_code == 413
