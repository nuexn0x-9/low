import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_group_and_ungroup_elements(client: AsyncClient):
    # Create session
    c_res = await client.post("/api/agent/sessions", json={"name": "Test Phase 7 Grouping"})
    assert c_res.status_code == 200
    data = c_res.json()
    sid = data["session_id"]
    tok = data["token"]

    doc_res = await client.get(f"/api/agent/sessions/{sid}/document")
    doc = doc_res.json()["frames"]
    screen_id = doc[0]["id"]

    # Add 2 elements
    res1 = await client.post(
        f"/api/agent/sessions/{sid}/actions",
        headers={"X-LOW-Token": tok},
        json={
            "action": "add_element",
            "params": {
                "screenId": screen_id,
                "element": {"type": "button", "name": "Btn 1", "x": 10, "y": 20, "width": 80, "height": 40},
            },
        },
    )
    assert res1.status_code == 200
    node1_id = res1.json()["result"]["elementId"]

    res2 = await client.post(
        f"/api/agent/sessions/{sid}/actions",
        headers={"X-LOW-Token": tok},
        json={
            "action": "add_element",
            "params": {
                "screenId": screen_id,
                "element": {"type": "text", "name": "Label 1", "x": 100, "y": 70, "width": 60, "height": 30},
            },
        },
    )
    assert res2.status_code == 200
    node2_id = res2.json()["result"]["elementId"]

    # Group elements
    group_res = await client.post(
        f"/api/agent/sessions/{sid}/actions",
        headers={"X-LOW-Token": tok},
        json={
            "action": "group_elements",
            "params": {
                "screenId": screen_id,
                "nodeIds": [node1_id, node2_id],
                "groupName": "Header Group",
            },
        },
    )
    assert group_res.status_code == 200
    group_data = group_res.json()["result"]
    group_id = group_data["groupId"]
    assert set(group_data["children"]) == {node1_id, node2_id}

    # Verify group node exists in document
    doc_res2 = await client.get(f"/api/agent/sessions/{sid}/document")
    frame_nodes = doc_res2.json()["frames"][0]["nodes"]
    group_node = next(n for n in frame_nodes if n["id"] == group_id)
    assert group_node["type"] == "group"
    assert group_node["name"] == "Header Group"
    assert group_node["x"] == 10
    assert group_node["y"] == 20
    assert group_node["width"] == 150  # 160 - 10
    assert group_node["height"] == 80  # 100 - 20
    assert set(group_node["children"]) == {node1_id, node2_id}

    # Ungroup
    ungroup_res = await client.post(
        f"/api/agent/sessions/{sid}/actions",
        headers={"X-LOW-Token": tok},
        json={
            "action": "ungroup_element",
            "params": {
                "screenId": screen_id,
                "groupId": group_id,
            },
        },
    )
    assert ungroup_res.status_code == 200
    ungroup_result = ungroup_res.json()["result"]
    assert ungroup_result["ungroupedId"] == group_id
    assert set(ungroup_result["children"]) == {node1_id, node2_id}


@pytest.mark.asyncio
async def test_align_and_distribute_elements(client: AsyncClient):
    c_res = await client.post("/api/agent/sessions", json={"name": "Test Align Distribute"})
    sid = c_res.json()["session_id"]
    tok = c_res.json()["token"]

    doc_res = await client.get(f"/api/agent/sessions/{sid}/document")
    screen_id = doc_res.json()["frames"][0]["id"]

    # Add 3 elements
    nodes = []
    for i in range(3):
        res = await client.post(
            f"/api/agent/sessions/{sid}/actions",
            headers={"X-LOW-Token": tok},
            json={
                "action": "add_element",
                "params": {
                    "screenId": screen_id,
                    "element": {"type": "rectangle", "name": f"Box {i+1}", "x": (i + 1) * 30, "y": (i + 1) * 40, "width": 40, "height": 30},
                },
            },
        )
        nodes.append(res.json()["result"]["elementId"])

    # Align left
    align_res = await client.post(
        f"/api/agent/sessions/{sid}/actions",
        headers={"X-LOW-Token": tok},
        json={
            "action": "align_elements",
            "params": {
                "screenId": screen_id,
                "nodeIds": nodes,
                "alignment": "left",
            },
        },
    )
    assert align_res.status_code == 200
    doc_res2 = await client.get(f"/api/agent/sessions/{sid}/document")
    frame_nodes = doc_res2.json()["frames"][0]["nodes"]
    aligned_nodes = [n for n in frame_nodes if n["id"] in nodes]
    assert all(n["x"] == 30 for n in aligned_nodes)

    # Distribute vertical
    dist_res = await client.post(
        f"/api/agent/sessions/{sid}/actions",
        headers={"X-LOW-Token": tok},
        json={
            "action": "distribute_elements",
            "params": {
                "screenId": screen_id,
                "nodeIds": nodes,
                "axis": "vertical",
            },
        },
    )
    assert dist_res.status_code == 200


@pytest.mark.asyncio
async def test_layer_visibility_lock_and_reorder(client: AsyncClient):
    c_res = await client.post("/api/agent/sessions", json={"name": "Test Layer Operations"})
    sid = c_res.json()["session_id"]
    tok = c_res.json()["token"]

    doc_res = await client.get(f"/api/agent/sessions/{sid}/document")
    screen_id = doc_res.json()["frames"][0]["id"]

    res = await client.post(
        f"/api/agent/sessions/{sid}/actions",
        headers={"X-LOW-Token": tok},
        json={
            "action": "add_element",
            "params": {
                "screenId": screen_id,
                "element": {"type": "text", "name": "Heading", "x": 20, "y": 20, "width": 100, "height": 30},
            },
        },
    )
    node_id = res.json()["result"]["elementId"]

    # Lock layer
    lock_res = await client.post(
        f"/api/agent/sessions/{sid}/actions",
        headers={"X-LOW-Token": tok},
        json={
            "action": "set_layer_lock",
            "params": {"screenId": screen_id, "nodeId": node_id, "locked": True},
        },
    )
    assert lock_res.status_code == 200

    # Hide layer
    hide_res = await client.post(
        f"/api/agent/sessions/{sid}/actions",
        headers={"X-LOW-Token": tok},
        json={
            "action": "set_layer_visibility",
            "params": {"screenId": screen_id, "nodeId": node_id, "hidden": True},
        },
    )
    assert hide_res.status_code == 200

    # Reorder layer to front
    reorder_res = await client.post(
        f"/api/agent/sessions/{sid}/actions",
        headers={"X-LOW-Token": tok},
        json={
            "action": "reorder_layer",
            "params": {"screenId": screen_id, "nodeId": node_id, "direction": "front"},
        },
    )
    assert reorder_res.status_code == 200

    # Verify document state
    doc_res2 = await client.get(f"/api/agent/sessions/{sid}/document")
    frame_nodes = doc_res2.json()["frames"][0]["nodes"]
    last_node = frame_nodes[-1]
    assert last_node["id"] == node_id
    assert last_node["locked"] is True
    assert last_node["hidden"] is True
