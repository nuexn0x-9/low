import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_project_crud(client: AsyncClient, auth_headers: dict):
    # List projects initially
    resp = await client.get("/api/projects", headers=auth_headers)
    assert resp.status_code == 200
    initial_count = len(resp.json())

    # Create project
    create_resp = await client.post(
        "/api/projects",
        headers=auth_headers,
        json={"name": "Finance App Mobile", "description": "Banking app design"},
    )
    assert create_resp.status_code == 201
    project = create_resp.json()
    project_id = project["id"]
    assert project["name"] == "Finance App Mobile"
    assert project["screens_count"] == 1

    # List projects contains new project
    list_resp = await client.get("/api/projects", headers=auth_headers)
    assert list_resp.status_code == 200
    projects = list_resp.json()
    assert len(projects) == initial_count + 1
    assert any(p["id"] == project_id for p in projects)

    # Get single project
    detail_resp = await client.get(f"/api/projects/{project_id}", headers=auth_headers)
    assert detail_resp.status_code == 200
    assert detail_resp.json()["id"] == project_id

    # Update project
    patch_resp = await client.patch(
        f"/api/projects/{project_id}",
        headers=auth_headers,
        json={"name": "Finance App v2", "description": "Updated banking app"},
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["name"] == "Finance App v2"

    # Delete project
    del_resp = await client.delete(f"/api/projects/{project_id}", headers=auth_headers)
    assert del_resp.status_code == 200

    # Get deleted project should return 404
    get_del_resp = await client.get(f"/api/projects/{project_id}", headers=auth_headers)
    assert get_del_resp.status_code == 404
