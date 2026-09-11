from datetime import datetime
from pydantic import BaseModel
from typing import Optional, List, Any, Dict


class SessionCreate(BaseModel):
    name: Optional[str] = "LOW Session"
    project_id: Optional[str] = None
    document: Optional[List[Dict[str, Any]]] = None
    preset: Optional[str] = "full_editor_assistant"
    scopes: Optional[List[str]] = None


class SessionOut(BaseModel):
    session_id: str
    token: Optional[str] = None
    name: str
    seq: int
    frames: List[Dict[str, Any]]
    expires_at: datetime
    scopes: List[str] = []
    preset: Optional[str] = None
    is_revoked: bool = False


class SessionDetailOut(BaseModel):
    id: str
    project_id: Optional[str] = None
    screens: int
    seq: int
    expires_at: datetime
    created_at: datetime
    updated_at: datetime
    scopes: List[str] = []
    preset: Optional[str] = None
    is_revoked: bool = False
    revoked_at: Optional[datetime] = None


class AgentActionBody(BaseModel):
    action: str
    params: Dict[str, Any] = {}
    dryRun: bool = False


class AgentBatchItem(BaseModel):
    action: str
    params: Dict[str, Any] = {}


class AgentEventOut(BaseModel):
    seq: int
    action: str
    params: Dict[str, Any]
    result: Any
    created_at: datetime
    dry_run: bool = False
    status: str = "applied"
    scope_used: Optional[str] = None


class SessionEventsOut(BaseModel):
    seq: int
    frames: List[Dict[str, Any]]
    events: List[Dict[str, Any]]


class AgentInstructionsOut(BaseModel):
    baseUrl: str
    sessionId: str
    tokenInstruction: str
    authHeader: str
    schemaEndpoint: str
    documentEndpoint: str
    actionsEndpoint: str
    scopes: List[str]
    preset: Optional[str] = None
    actionLimits: Dict[str, Any]
    dryRunGuide: str
    batchUpdateGuide: str
    curlExample: str
    promptText: str
