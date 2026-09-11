import json
import time
import httpx
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.setting import UserSetting
from app.core.config import settings as app_settings

DEFAULT_AI_IMPORT_SETTINGS: Dict[str, Any] = {
    "provider": "mock",
    "providerMode": "database_managed",
    "baseUrl": "",
    "endpointPath": "/v1/chat/completions",
    "model": "gpt-4o-mini",
    "timeoutSeconds": 30,
    "maxRetries": 2,
    "maxOutputTokens": 4096,
    "defaultResultType": "screen",
    "framePreset": "390x844",
    "monochromeOutput": True,
    "strictValidation": True,
    "autoPreview": True,
    "saveDraftHistory": True,
    "maxFrames": 5,
    "maxNodesPerFrame": 150,
    "maxPayloadBytes": 2097152,
    "rejectExternalAssetUrls": False,
    "rejectRawHtmlScript": True,
    "apiKey": "",  # Never returned to client
}

DEFAULT_AGENT_CONNECT_SETTINGS: Dict[str, Any] = {
    "publicBaseUrl": "http://localhost:8000",
    "schemaEndpoint": "/api/agent/schema",
    "sessionsEndpoint": "/api/agent/sessions",
    "actionsEndpointPattern": "/api/agent/sessions/{session_id}/actions",
    "eventsEndpointPattern": "/api/agent/sessions/{session_id}/events",
    "instructionsEndpointPattern": "/api/agent/sessions/{session_id}/instructions",
    "eventPollIntervalMs": 1500,
    "maxPayloadBytes": 1048576,
    "enablePublicInstructionsUrl": True,
    "enableCurlExamples": True,
    "defaultPreset": "standard",
    "defaultExpiryMinutes": 60,
    "requireDryRunFirst": False,
    "allowBatchUpdate": True,
    "maxBatchOperations": 25,
    "allowUndoAgentChanges": True,
    "requireApprovalForDestructiveActions": False,
    "logDryRunEvents": True,
    "instructionFormat": "general_http",
    "defaultScopes": [
        "document:read",
        "screen:write",
        "element:write",
        "component:write"
    ],
}


class SettingsService:
    @staticmethod
    async def get_raw_settings(db: AsyncSession, user_id: str, key: str) -> Dict[str, Any]:
        result = await db.execute(
            select(UserSetting).where(
                UserSetting.user_id == user_id,
                UserSetting.key == key
            )
        )
        row = result.scalars().first()
        if not row or not row.value_json:
            return {}
        try:
            return json.loads(row.value_json)
        except Exception:
            return {}

    @classmethod
    async def get_ai_import_settings(cls, db: AsyncSession, user_id: str) -> Dict[str, Any]:
        stored = await cls.get_raw_settings(db, user_id, "ai_import")
        merged = {**DEFAULT_AI_IMPORT_SETTINGS, **stored}
        
        # Check if configured
        has_db_key = bool(merged.get("apiKey", "").strip())
        has_env_key = bool(app_settings.OPENAI_API_KEY.strip()) if hasattr(app_settings, "OPENAI_API_KEY") else False
        is_mock = merged.get("provider") == "mock"
        
        configured = is_mock or has_db_key or has_env_key
        
        # Determine providerMode
        provider_mode = "env_managed" if (has_env_key and not has_db_key and not is_mock) else "database_managed"
        
        # Safe copy without apiKey
        safe_copy = {k: v for k, v in merged.items() if k != "apiKey"}
        safe_copy["configured"] = configured
        safe_copy["providerMode"] = provider_mode
        return safe_copy

    @classmethod
    async def update_ai_import_settings(cls, db: AsyncSession, user_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        stored = await cls.get_raw_settings(db, user_id, "ai_import")
        current_data = {**DEFAULT_AI_IMPORT_SETTINGS, **stored}
        
        for k, v in update_data.items():
            if v is not None:
                # If updating apiKey, only overwrite if non-empty
                if k == "apiKey":
                    if v.strip():
                        current_data["apiKey"] = v.strip()
                else:
                    current_data[k] = v

        # Upsert
        result = await db.execute(
            select(UserSetting).where(
                UserSetting.user_id == user_id,
                UserSetting.key == "ai_import"
            )
        )
        row = result.scalars().first()
        if not row:
            row = UserSetting(user_id=user_id, key="ai_import", value_json=json.dumps(current_data))
            db.add(row)
        else:
            row.value_json = json.dumps(current_data)
        
        await db.commit()
        return await cls.get_ai_import_settings(db, user_id)

    @classmethod
    async def clear_ai_api_key(cls, db: AsyncSession, user_id: str) -> None:
        stored = await cls.get_raw_settings(db, user_id, "ai_import")
        if "apiKey" in stored:
            stored["apiKey"] = ""
            result = await db.execute(
                select(UserSetting).where(
                    UserSetting.user_id == user_id,
                    UserSetting.key == "ai_import"
                )
            )
            row = result.scalars().first()
            if row:
                row.value_json = json.dumps(stored)
                await db.commit()

    @classmethod
    async def get_effective_ai_api_key(cls, db: AsyncSession, user_id: str) -> str:
        stored = await cls.get_raw_settings(db, user_id, "ai_import")
        if stored.get("apiKey", "").strip():
            return stored["apiKey"].strip()
        if hasattr(app_settings, "OPENAI_API_KEY") and app_settings.OPENAI_API_KEY.strip():
            return app_settings.OPENAI_API_KEY.strip()
        return ""

    @classmethod
    async def test_ai_connection(
        cls,
        db: AsyncSession,
        user_id: str,
        provider: Optional[str] = None,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        endpoint_path: Optional[str] = None,
        model: Optional[str] = None
    ) -> Dict[str, Any]:
        stored = await cls.get_raw_settings(db, user_id, "ai_import")
        active_provider = provider or stored.get("provider", "mock")
        active_model = model or stored.get("model", "gpt-4o-mini")
        
        if active_provider == "mock":
            return {
                "ok": True,
                "latencyMs": 12,
                "provider": "mock",
                "model": active_model,
                "message": "Mock provider is ready and functional."
            }

        effective_key = api_key if (api_key and api_key.strip()) else await cls.get_effective_ai_api_key(db, user_id)
        if not effective_key:
            return {
                "ok": False,
                "latencyMs": 0,
                "provider": active_provider,
                "model": active_model,
                "message": "No API key configured.",
                "error": "API key is required to test external provider connection."
            }

        target_base = (base_url or stored.get("baseUrl") or "https://api.openai.com").rstrip("/")
        path = endpoint_path or stored.get("endpointPath") or "/v1/chat/completions"
        target_url = f"{target_base}{path}"

        start_time = time.time()
        try:
            headers = {
                "Authorization": f"Bearer {effective_key}",
                "Content-Type": "application/json"
            }
            # Send a minimal test ping
            payload = {
                "model": active_model,
                "messages": [{"role": "user", "content": "ping"}],
                "max_tokens": 5
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(target_url, headers=headers, json=payload)
                elapsed_ms = int((time.time() - start_time) * 1000)

                if resp.status_code == 200:
                    return {
                        "ok": True,
                        "latencyMs": elapsed_ms,
                        "provider": active_provider,
                        "model": active_model,
                        "message": f"Successfully connected ({resp.status_code} OK, {elapsed_ms}ms)."
                    }
                else:
                    err_msg = f"HTTP {resp.status_code}"
                    try:
                        err_json = resp.json()
                        if "error" in err_json:
                            err_msg = str(err_json["error"].get("message", err_msg))
                    except Exception:
                        pass
                    return {
                        "ok": False,
                        "latencyMs": elapsed_ms,
                        "provider": active_provider,
                        "model": active_model,
                        "message": f"Connection returned status {resp.status_code}.",
                        "error": err_msg
                    }
        except Exception as exc:
            elapsed_ms = int((time.time() - start_time) * 1000)
            return {
                "ok": False,
                "latencyMs": elapsed_ms,
                "provider": active_provider,
                "model": active_model,
                "message": "Connection error or timeout.",
                "error": str(exc)
            }

    @classmethod
    async def get_agent_connect_settings(cls, db: AsyncSession, user_id: str) -> Dict[str, Any]:
        stored = await cls.get_raw_settings(db, user_id, "agent_connect")
        return {**DEFAULT_AGENT_CONNECT_SETTINGS, **stored}

    @classmethod
    async def update_agent_connect_settings(cls, db: AsyncSession, user_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        stored = await cls.get_raw_settings(db, user_id, "agent_connect")
        current_data = {**DEFAULT_AGENT_CONNECT_SETTINGS, **stored}
        
        for k, v in update_data.items():
            if v is not None:
                current_data[k] = v

        result = await db.execute(
            select(UserSetting).where(
                UserSetting.user_id == user_id,
                UserSetting.key == "agent_connect"
            )
        )
        row = result.scalars().first()
        if not row:
            row = UserSetting(user_id=user_id, key="agent_connect", value_json=json.dumps(current_data))
            db.add(row)
        else:
            row.value_json = json.dumps(current_data)
        
        await db.commit()
        return await cls.get_agent_connect_settings(db, user_id)

    @classmethod
    def test_agent_endpoints(cls, settings_data: Dict[str, Any]) -> Dict[str, Any]:
        base_url = settings_data.get("publicBaseUrl", "http://localhost:8000").rstrip("/")
        schema_path = settings_data.get("schemaEndpoint", "/api/agent/schema")
        full_schema_url = f"{base_url}{schema_path}"
        
        return {
            "ok": True,
            "schemaUrl": full_schema_url,
            "message": f"Endpoints configured correctly. Schema reachable at {full_schema_url}"
        }
