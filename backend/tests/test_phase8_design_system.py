import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_agent_schema_phase8(client: AsyncClient):
    res = await client.get("/api/agent/schema")
    assert res.status_code == 200
    schema = res.json()
    assert schema["version"] in ("2.2.0", "2.3.0")
    action_names = [a["action"] for a in schema["actions"]]
    assert "create_component_from_selection" in action_names
    assert "insert_component_instance" in action_names
    assert "detach_component_instance" in action_names
    assert "update_design_tokens" in action_names
    assert "apply_style_preset" in action_names
    assert "update_text_content" in action_names

@pytest.mark.asyncio
async def test_design_tokens_api(client: AsyncClient):
    # 1. Create a project
    create_res = await client.post("/api/projects", json={"name": "Tokens Test", "description": "Testing design tokens"})
    assert create_res.status_code in [200, 201]
    project_id = create_res.json()["id"]

    # 2. Get tokens (defaults)
    get_res = await client.get(f"/api/projects/{project_id}/design-tokens")
    assert get_res.status_code == 200
    res_data = get_res.json()
    assert "designTokens" in res_data
    tokens = res_data["designTokens"]
    assert "colors" in tokens
    assert "radius" in tokens
    assert "spacing" in tokens

    # 3. Put custom tokens
    new_tokens = {
        "colors": {"primary": "#123456", "background": "#fafafa"},
        "radius": {"md": 8},
        "spacing": {"md": 16}
    }
    put_res = await client.put(f"/api/projects/{project_id}/design-tokens", json=new_tokens)
    assert put_res.status_code == 200
    updated = put_res.json()["designTokens"]
    assert updated["colors"]["primary"] == "#123456"

    # 4. Verify persisted
    get_res2 = await client.get(f"/api/projects/{project_id}/design-tokens")
    assert get_res2.status_code == 200
    assert get_res2.json()["designTokens"]["colors"]["primary"] == "#123456"

@pytest.mark.asyncio
async def test_component_detach_api(client: AsyncClient):
    # 1. Create a component
    comp_res = await client.post("/api/components", json={
        "name": "Card Header",
        "category": "card",
        "content": {
            "nodes": [
                {"id": "c1", "type": "rectangle", "name": "Box", "style": {"fill": "#eee"}},
                {"id": "c2", "type": "text", "name": "Title", "text": "Card Title", "style": {}}
            ]
        }
    })
    assert comp_res.status_code in [200, 201]
    comp_id = comp_res.json()["id"]

    # 2. Detach component
    detach_res = await client.post(f"/api/components/{comp_id}/detach", json={
        "instanceId": "inst_1",
        "overrides": {
            "text": "Overridden Card Title",
            "style": {"fill": "#333"}
        }
    })
    assert detach_res.status_code == 200
    data = detach_res.json()
    assert data["status"] == "success"
    assert "nodes" in data
    assert len(data["nodes"]) == 2

@pytest.mark.asyncio
async def test_agent_actions_phase8(client: AsyncClient):
    # Create session
    c_res = await client.post("/api/agent/sessions", json={"name": "Test Phase 8 Actions"})
    assert c_res.status_code == 200
    sess_data = c_res.json()
    sid = sess_data["session_id"]
    tok = sess_data["token"]

    doc_res = await client.get(f"/api/agent/sessions/{sid}/document")
    doc = doc_res.json()["frames"]
    screen_id = doc[0]["id"]

    # 1. Insert text element
    add_res = await client.post(
        f"/api/agent/sessions/{sid}/actions",
        headers={"X-LOW-Token": tok},
        json={
            "action": "add_element",
            "params": {
                "screenId": screen_id,
                "element": {
                    "type": "text",
                    "name": "My Text",
                    "text": "Hello World",
                    "x": 10, "y": 20, "width": 100, "height": 30,
                    "style": {"fontSize": 14, "fontFamily": "Inter"}
                }
            }
        }
    )
    assert add_res.status_code == 200
    text_id = add_res.json()["result"]["elementId"]

    # 2. update_text_content action
    upd_res = await client.post(
        f"/api/agent/sessions/{sid}/actions",
        headers={"X-LOW-Token": tok},
        json={
            "action": "update_text_content",
            "params": {
                "screenId": screen_id,
                "nodeId": text_id,
                "text": "Updated Text"
            }
        }
    )
    assert upd_res.status_code == 200
    assert upd_res.json()["result"]["text"] == "Updated Text"

    # 3. apply_style_preset action
    preset_res = await client.post(
        f"/api/agent/sessions/{sid}/actions",
        headers={"X-LOW-Token": tok},
        json={
            "action": "apply_style_preset",
            "params": {
                "screenId": screen_id,
                "nodeIds": [text_id],
                "preset": "heading"
            }
        }
    )
    assert preset_res.status_code == 200
    assert preset_res.json()["result"]["preset"] == "heading"

    # 4. create_component_from_selection action
    comp_res = await client.post(
        f"/api/agent/sessions/{sid}/actions",
        headers={"X-LOW-Token": tok},
        json={
            "action": "create_component_from_selection",
            "params": {
                "name": "Text Comp",
                "screenId": screen_id,
                "nodeIds": [text_id]
            }
        }
    )
    assert comp_res.status_code == 200
    comp_id = comp_res.json()["result"]["component"]["id"]

    # 5. insert_component_instance action
    ins_res = await client.post(
        f"/api/agent/sessions/{sid}/actions",
        headers={"X-LOW-Token": tok},
        json={
            "action": "insert_component_instance",
            "params": {
                "screenId": screen_id,
                "componentId": comp_id,
                "x": 50,
                "y": 100,
                "overrides": {"text": "Instance 2"}
            }
        }
    )
    assert ins_res.status_code == 200
    inst2_id = ins_res.json()["result"]["node"]["id"]

    # 6. detach_component_instance action
    detach_res = await client.post(
        f"/api/agent/sessions/{sid}/actions",
        headers={"X-LOW-Token": tok},
        json={
            "action": "detach_component_instance",
            "params": {
                "screenId": screen_id,
                "nodeId": inst2_id
            }
        }
    )
    assert detach_res.status_code == 200
    assert detach_res.json()["result"]["ok"] is True

    # 7. update_design_tokens action
    token_res = await client.post(
        f"/api/agent/sessions/{sid}/actions",
        headers={"X-LOW-Token": tok},
        json={
            "action": "update_design_tokens",
            "params": {
                "tokens": {
                    "colors": {"primary": "#00FF00"}
                }
            }
        }
    )
    assert token_res.status_code == 200
    assert token_res.json()["result"]["tokens"]["colors"]["primary"] == "#00FF00"
