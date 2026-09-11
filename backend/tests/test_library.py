import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_components_and_templates(client: AsyncClient, auth_headers: dict):
    # 1. Check components listing (has seeded built-in components)
    comps_resp = await client.get("/api/components", headers=auth_headers)
    assert comps_resp.status_code == 200
    comps = comps_resp.json()
    assert len(comps) >= 6
    assert any(c["name"] == "Button" for c in comps)

    # 2. Create custom component
    new_comp_resp = await client.post(
        "/api/components",
        headers=auth_headers,
        json={
            "name": "Custom Badge",
            "category": "primitives",
            "content": {"type": "badge", "text": "NEW", "style": {"fill": "#000000"}},
        },
    )
    assert new_comp_resp.status_code == 201
    comp_id = new_comp_resp.json()["id"]

    # 3. Update custom component
    up_comp_resp = await client.patch(
        f"/api/components/{comp_id}",
        headers=auth_headers,
        json={"name": "Custom Tag"},
    )
    assert up_comp_resp.status_code == 200
    assert up_comp_resp.json()["name"] == "Custom Tag"

    # 4. Delete custom component
    del_comp_resp = await client.delete(f"/api/components/{comp_id}", headers=auth_headers)
    assert del_comp_resp.status_code == 200

    # 5. Check templates listing (has seeded built-in templates)
    tpls_resp = await client.get("/api/templates", headers=auth_headers)
    assert tpls_resp.status_code == 200
    tpls = tpls_resp.json()
    assert len(tpls) >= 3
    assert any(t["name"] == "Login" for t in tpls)

    # 6. Create custom template
    new_tpl_resp = await client.post(
        "/api/templates",
        headers=auth_headers,
        json={
            "name": "Custom Settings Screen",
            "category": "screens",
            "content": [{"id": "n1", "type": "text", "name": "Settings", "x": 20, "y": 40, "width": 100, "height": 30}],
        },
    )
    assert new_tpl_resp.status_code == 201
    tpl_id = new_tpl_resp.json()["id"]

    # 7. Delete custom template
    del_tpl_resp = await client.delete(f"/api/templates/{tpl_id}", headers=auth_headers)
    assert del_tpl_resp.status_code == 200
