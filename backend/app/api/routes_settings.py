from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any

from app.core.database import get_db
from app.models.user import User
from app.api.deps import get_current_user_optional
from app.services.settings_service import SettingsService
from app.schemas.setting import (
    AIImportSettingsOut,
    AIImportSettingsUpdate,
    AIImportTestConnectionRequest,
    AIImportTestConnectionResponse,
    AgentConnectSettingsOut,
    AgentConnectSettingsUpdate,
    AgentConnectTestEndpointsResponse,
)

router = APIRouter(prefix="/settings", tags=["settings"])


# ---------------------------------------------------------------------------
# AI Import Settings Endpoints
# ---------------------------------------------------------------------------

@router.get("/ai-import", response_model=AIImportSettingsOut)
async def get_ai_import_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional)
):
    user_id = current_user.id if current_user else "usr_default"
    data = await SettingsService.get_ai_import_settings(db, user_id)
    return AIImportSettingsOut(**data)


@router.put("/ai-import", response_model=AIImportSettingsOut)
async def update_ai_import_settings(
    payload: AIImportSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional)
):
    user_id = current_user.id if current_user else "usr_default"
    update_dict = payload.model_dump(exclude_unset=True)
    data = await SettingsService.update_ai_import_settings(db, user_id, update_dict)
    return AIImportSettingsOut(**data)


@router.post("/ai-import/test-connection", response_model=AIImportTestConnectionResponse)
async def test_ai_connection(
    payload: AIImportTestConnectionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional)
):
    user_id = current_user.id if current_user else "usr_default"
    result = await SettingsService.test_ai_connection(
        db=db,
        user_id=user_id,
        provider=payload.provider,
        api_key=payload.apiKey,
        base_url=payload.baseUrl,
        endpoint_path=payload.endpointPath,
        model=payload.model,
    )
    return AIImportTestConnectionResponse(**result)


@router.delete("/ai-import/api-key", status_code=status.HTTP_200_OK)
async def clear_ai_api_key(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional)
):
    user_id = current_user.id if current_user else "usr_default"
    await SettingsService.clear_ai_api_key(db, user_id)
    return {"message": "API key cleared successfully."}


# ---------------------------------------------------------------------------
# Agent Connect Settings Endpoints
# ---------------------------------------------------------------------------

@router.get("/agent-connect", response_model=AgentConnectSettingsOut)
async def get_agent_connect_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional)
):
    user_id = current_user.id if current_user else "usr_default"
    data = await SettingsService.get_agent_connect_settings(db, user_id)
    return AgentConnectSettingsOut(**data)


@router.put("/agent-connect", response_model=AgentConnectSettingsOut)
async def update_agent_connect_settings(
    payload: AgentConnectSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional)
):
    user_id = current_user.id if current_user else "usr_default"
    update_dict = payload.model_dump(exclude_unset=True)
    data = await SettingsService.update_agent_connect_settings(db, user_id, update_dict)
    return AgentConnectSettingsOut(**data)


@router.post("/agent-connect/test-endpoints", response_model=AgentConnectTestEndpointsResponse)
async def test_agent_endpoints(
    payload: AgentConnectSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_optional)
):
    user_id = current_user.id if current_user else "usr_default"
    current_settings = await SettingsService.get_agent_connect_settings(db, user_id)
    merged = {**current_settings, **payload.model_dump(exclude_unset=True)}
    result = SettingsService.test_agent_endpoints(merged)
    return AgentConnectTestEndpointsResponse(**result)
