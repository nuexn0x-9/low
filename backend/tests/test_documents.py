import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_document_lifecycle(client: AsyncClient, auth_headers: dict):
    # 1. Create a project
    proj_resp = await client.post(
        "/api/projects",
        headers=auth_headers,
        json={"name": "Doc Test Project"},
    )
    assert proj_resp.status_code == 201
    project_id = proj_resp.json()["id"]

    # 2. Get document
    doc_resp = await client.get(f"/api/projects/{project_id}/document", headers=auth_headers)
    assert doc_resp.status_code == 200
    doc_data = doc_resp.json()
    assert doc_data["revision"] == 1
    assert "frames" in doc_data["content"]
    assert len(doc_data["content"]["frames"]) == 1

    # 3. Update document (PUT)
    new_frames = [
        {
            "id": "screen_1",
            "name": "Welcome",
            "nodes": [
                {
                    "id": "node_1",
                    "type": "text",
                    "name": "Header",
                    "x": 20,
                    "y": 40,
                    "width": 200,
                    "height": 30,
                    "text": "Hello World",
                    "style": {},
                }
            ],
        },
        {
            "id": "screen_2",
            "name": "Profile",
            "nodes": [],
        },
    ]
    save_resp = await client.put(
        f"/api/projects/{project_id}/document",
        headers=auth_headers,
        json={"lowVersion": "1.0.0", "frames": new_frames},
    )
    assert save_resp.status_code == 200
    saved_doc = save_resp.json()
    assert saved_doc["revision"] == 2
    assert len(saved_doc["content"]["frames"]) == 2

    # 4. Autosave document
    autosave_resp = await client.post(
        f"/api/projects/{project_id}/document/autosave",
        headers=auth_headers,
        json={"frames": new_frames},
    )
    assert autosave_resp.status_code == 200
    autosaved_doc = autosave_resp.json()
    assert autosaved_doc["revision"] == 3

    # 5. Create version snapshot
    ver_resp = await client.post(
        f"/api/projects/{project_id}/document/versions",
        headers=auth_headers,
        json={"reason": "Before major changes"},
    )
    assert ver_resp.status_code == 201
    version_data = ver_resp.json()
    assert version_data["version_number"] == 1
    assert version_data["reason"] == "Before major changes"

    # 6. List versions
    list_ver_resp = await client.get(
        f"/api/projects/{project_id}/document/versions",
        headers=auth_headers,
    )
    assert list_ver_resp.status_code == 200
    versions = list_ver_resp.json()
    assert len(versions) >= 1
    assert versions[0]["version_number"] == 1
