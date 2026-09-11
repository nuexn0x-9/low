import pytest
import uuid
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_auth_flow(client: AsyncClient):
    unique_email = f"user_{uuid.uuid4().hex[:6]}@example.com"
    password = "securePassword123"

    # Register
    reg_resp = await client.post(
        "/api/auth/register",
        json={"email": unique_email, "password": password, "name": "Design Pro"},
    )
    assert reg_resp.status_code == 201
    data = reg_resp.json()
    assert "access_token" in data
    assert data["user"]["email"] == unique_email
    assert data["user"]["name"] == "Design Pro"

    token = data["access_token"]

    # Duplicate register
    dup_resp = await client.post(
        "/api/auth/register",
        json={"email": unique_email, "password": password, "name": "Duplicate"},
    )
    assert dup_resp.status_code == 400

    # Login
    login_resp = await client.post(
        "/api/auth/login",
        json={"email": unique_email, "password": password},
    )
    assert login_resp.status_code == 200
    assert "access_token" in login_resp.json()

    # Login invalid password
    bad_login = await client.post(
        "/api/auth/login",
        json={"email": unique_email, "password": "wrongpassword"},
    )
    assert bad_login.status_code == 401

    # Me with valid token
    me_resp = await client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == unique_email

    # Me without token
    unauth_resp = await client.get("/api/auth/me")
    assert unauth_resp.status_code == 401

    # Logout
    logout_resp = await client.post("/api/auth/logout")
    assert logout_resp.status_code == 200
