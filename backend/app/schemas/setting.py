from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# AI Import Settings Schemas
# ---------------------------------------------------------------------------

class AIImportSettingsOut(BaseModel):
    provider: str = "mock"
    providerMode: str = "database_managed"  # "env_managed" or "database_managed"
    configured: bool = True
    baseUrl: Optional[str] = None
    endpointPath: Optional[str] = "/v1/chat/completions"
    model: str = "gpt-4o-mini"
    timeoutSeconds: int = 30
    maxRetries: int = 2
    maxOutputTokens: int = 4096
    
    # Output Rules
    defaultResultType: str = "screen"
    framePreset: str = "390x844"
    monochromeOutput: bool = True
    strictValidation: bool = True
    autoPreview: bool = True
    saveDraftHistory: bool = True
    
    # Safety Limits
    maxFrames: int = 5
    maxNodesPerFrame: int = 150
    maxPayloadBytes: int = 2097152  # 2MB
    rejectExternalAssetUrls: bool = False
    rejectRawHtmlScript: bool = True


class AIImportSettingsUpdate(BaseModel):
    provider: Optional[str] = None
    apiKey: Optional[str] = None  # Handled securely, not echoed back
    baseUrl: Optional[str] = None
    endpointPath: Optional[str] = None
    model: Optional[str] = None
    timeoutSeconds: Optional[int] = Field(default=None, ge=5, le=300)
    maxRetries: Optional[int] = Field(default=None, ge=0, le=5)
    maxOutputTokens: Optional[int] = Field(default=None, ge=256, le=32768)
    
    # Output Rules
    defaultResultType: Optional[str] = None
    framePreset: Optional[str] = None
    monochromeOutput: Optional[bool] = None
    strictValidation: Optional[bool] = None
    autoPreview: Optional[bool] = None
    saveDraftHistory: Optional[bool] = None
    
    # Safety Limits
    maxFrames: Optional[int] = Field(default=None, ge=1, le=20)
    maxNodesPerFrame: Optional[int] = Field(default=None, ge=10, le=1000)
    maxPayloadBytes: Optional[int] = Field(default=None, ge=65536, le=10485760)
    rejectExternalAssetUrls: Optional[bool] = None
    rejectRawHtmlScript: Optional[bool] = None


class AIImportTestConnectionRequest(BaseModel):
    provider: Optional[str] = None
    apiKey: Optional[str] = None
    baseUrl: Optional[str] = None
    endpointPath: Optional[str] = None
    model: Optional[str] = None


class AIImportTestConnectionResponse(BaseModel):
    ok: bool
    latencyMs: int
    provider: str
    model: str
    message: str
    error: Optional[str] = None


# ---------------------------------------------------------------------------
# Agent Connect Settings Schemas
# ---------------------------------------------------------------------------

class AgentConnectSettingsOut(BaseModel):
    # Network & Public Endpoint
    publicBaseUrl: str = "http://localhost:8000"
    schemaEndpoint: str = "/api/agent/schema"
    sessionsEndpoint: str = "/api/agent/sessions"
    actionsEndpointPattern: str = "/api/agent/sessions/{session_id}/actions"
    eventsEndpointPattern: str = "/api/agent/sessions/{session_id}/events"
    instructionsEndpointPattern: str = "/api/agent/sessions/{session_id}/instructions"
    eventPollIntervalMs: int = 1500
    maxPayloadBytes: int = 1048576  # 1MB
    enablePublicInstructionsUrl: bool = True
    enableCurlExamples: bool = True

    # Security & Defaults
    defaultPreset: str = "standard"  # read_only, standard, full_access, custom
    defaultExpiryMinutes: int = 60
    requireDryRunFirst: bool = False
    allowBatchUpdate: bool = True
    maxBatchOperations: int = 25
    allowUndoAgentChanges: bool = True
    requireApprovalForDestructiveActions: bool = False
    logDryRunEvents: bool = True
    instructionFormat: str = "general_http"
    defaultScopes: List[str] = Field(default_factory=lambda: [
        "document:read", "screen:write", "element:write", "component:write"
    ])


class AgentConnectSettingsUpdate(BaseModel):
    publicBaseUrl: Optional[str] = None
    schemaEndpoint: Optional[str] = None
    sessionsEndpoint: Optional[str] = None
    actionsEndpointPattern: Optional[str] = None
    eventsEndpointPattern: Optional[str] = None
    instructionsEndpointPattern: Optional[str] = None
    eventPollIntervalMs: Optional[int] = Field(default=None, ge=500, le=10000)
    maxPayloadBytes: Optional[int] = Field(default=None, ge=65536, le=10485760)
    enablePublicInstructionsUrl: Optional[bool] = None
    enableCurlExamples: Optional[bool] = None

    defaultPreset: Optional[str] = None
    defaultExpiryMinutes: Optional[int] = Field(default=None, ge=5, le=1440)
    requireDryRunFirst: Optional[bool] = None
    allowBatchUpdate: Optional[bool] = None
    maxBatchOperations: Optional[int] = Field(default=None, ge=1, le=100)
    allowUndoAgentChanges: Optional[bool] = None
    requireApprovalForDestructiveActions: Optional[bool] = None
    logDryRunEvents: Optional[bool] = None
    instructionFormat: Optional[str] = None
    defaultScopes: Optional[List[str]] = None


class AgentConnectTestEndpointsResponse(BaseModel):
    ok: bool
    schemaUrl: str
    message: str
    error: Optional[str] = None
