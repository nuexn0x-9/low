import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_validate_and_import_export(client: AsyncClient, auth_headers: dict):
    # 1. Valid document v1.0.0
    valid_v1 = {
        "lowVersion": "1.0.0",
        "document": {
            "id": "test_import",
            "name": "Test Import",
            "frames": [
                {
                    "id": "frame_1",
                    "name": "Screen 1",
                    "nodes": [
                        {
                            "id": "n1",
                            "type": "text",
                            "name": "Label",
                            "x": 20,
                            "y": 50,
                            "width": 100,
                            "height": 30,
                            "text": "Hi",
                            "style": {},
                        }
                    ],
                }
            ],
        },
    }

    val_resp = await client.post(
        "/api/import/low-json/validate",
        json={"data": valid_v1},
    )
    assert val_resp.status_code == 200
    res = val_resp.json()
    assert res["valid"] is True
    assert res["screens_count"] == 1
    assert res["total_nodes"] == 1

    # 2. Invalid document (empty frames)
    bad_doc = {"lowVersion": "1.0.0", "frames": []}
    bad_val_resp = await client.post(
        "/api/import/low-json/validate",
        json={"data": bad_doc},
    )
    assert bad_val_resp.status_code == 200
    assert bad_val_resp.json()["valid"] is False

    # 3. Invalid document (bad node dimensions)
    bad_node_doc = {
        "frames": [
            {
                "id": "f1",
                "name": "S1",
                "nodes": [
                    {"type": "text", "x": "invalid_number", "y": 0, "width": 10, "height": 10}
                ],
            }
        ]
    }
    bad_node_resp = await client.post(
        "/api/import/low-json/validate",
        json={"data": bad_node_doc},
    )
    assert bad_node_resp.status_code == 200
    assert bad_node_resp.json()["valid"] is False

    # 4. Import into project
    proj_resp = await client.post(
        "/api/projects",
        headers=auth_headers,
        json={"name": "Import Target Project"},
    )
    project_id = proj_resp.json()["id"]

    import_resp = await client.post(
        f"/api/projects/{project_id}/import/low-json",
        headers=auth_headers,
        json=valid_v1,
    )
    assert import_resp.status_code == 200
    assert import_resp.json()["status"] == "ok"

    # Verify document now contains the imported content
    doc_resp = await client.get(f"/api/projects/{project_id}/document", headers=auth_headers)
    assert doc_resp.status_code == 200
    doc = doc_resp.json()
    assert len(doc["content"]["frames"]) == 1
    assert doc["content"]["frames"][0]["name"] == "Screen 1"

    # Verify a backup version snapshot was created
    ver_resp = await client.get(f"/api/projects/{project_id}/document/versions", headers=auth_headers)
    assert ver_resp.status_code == 200
    versions = ver_resp.json()
    assert any(v["reason"] == "pre-import backup" for v in versions)

    # 5. Export project
    export_resp = await client.get(f"/api/projects/{project_id}/export/low-json", headers=auth_headers)
    assert export_resp.status_code == 200
    exp = export_resp.json()
    assert exp["lowVersion"] == "1.0.0"
    assert "document" in exp
    assert exp["document"]["id"] == project_id
    assert len(exp["document"]["frames"]) == 1
