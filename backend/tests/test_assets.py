import pytest
import io
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_asset_operations(client: AsyncClient, auth_headers: dict):
    # Create project
    proj_resp = await client.post(
        "/api/projects",
        headers=auth_headers,
        json={"name": "Asset Project"},
    )
    project_id = proj_resp.json()["id"]

    # Upload an SVG asset
    svg_content = b"<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><rect width='24' height='24'/></svg>"
    files = {
        "file": ("icon.svg", io.BytesIO(svg_content), "image/svg+xml"),
    }
    upload_resp = await client.post(
        f"/api/projects/{project_id}/assets",
        headers=auth_headers,
        files=files,
    )
    assert upload_resp.status_code == 201
    asset = upload_resp.json()
    assert asset["file_name"] == "icon.svg"
    assert asset["mime_type"] == "image/svg+xml"
    asset_id = asset["id"]

    # List project assets
    list_resp = await client.get(f"/api/projects/{project_id}/assets", headers=auth_headers)
    assert list_resp.status_code == 200
    assets = list_resp.json()
    assert len(assets) == 1
    assert assets[0]["id"] == asset_id

    # Download asset
    dl_resp = await client.get(f"/api/assets/{asset_id}")
    assert dl_resp.status_code == 200
    assert dl_resp.content == svg_content

    # Delete asset
    del_resp = await client.delete(f"/api/assets/{asset_id}", headers=auth_headers)
    assert del_resp.status_code == 200

    # Verify download fails with 404 after deletion
    dl_after_resp = await client.get(f"/api/assets/{asset_id}")
    assert dl_after_resp.status_code == 404
