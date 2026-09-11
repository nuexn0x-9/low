from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class AIGenerateRequest(BaseModel):
    type: str = Field("screen", description="screen | component | template | prototype_flow")
    prompt: str = Field(..., min_length=2, description="Natural language prompt")
    projectId: Optional[str] = None
    framePreset: Optional[Dict[str, Any]] = Field(default_factory=dict)


class AIGenerateValidation(BaseModel):
    valid: bool
    warnings: List[str] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)


class AIGenerateResponse(BaseModel):
    draftId: Optional[str] = None
    status: str = "draft"
    lowVersion: str = "1.1.0"
    resultType: str
    documentPatch: Dict[str, Any]
    validation: AIGenerateValidation
    provider: Optional[str] = None
    model: Optional[str] = None
    durationMs: Optional[int] = None
    tokenUsage: Optional[Dict[str, Any]] = None


class AIValidateRequest(BaseModel):
    lowVersion: Optional[str] = "1.1.0"
    resultType: Optional[str] = "screen"
    documentPatch: Dict[str, Any]


class AIValidateResponse(BaseModel):
    valid: bool
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)


class AIApplyRequest(BaseModel):
    resultType: Optional[str] = "screen"
    documentPatch: Optional[Dict[str, Any]] = None
    expected_revision: Optional[int] = None


class AIProviderInfo(BaseModel):
    name: str
    active: bool
    configured: bool
    model: str
    description: str


class AIProvidersResponse(BaseModel):
    active_provider: str
    providers: List[AIProviderInfo]


class AIDraftListItem(BaseModel):
    id: str
    project_id: Optional[str] = None
    provider: str
    model: str
    result_type: str
    prompt: str
    status: str
    duration_ms: int
    token_usage: Optional[Dict[str, Any]] = None
    created_at: datetime
    applied_at: Optional[datetime] = None


class AIDraftDetailResponse(AIDraftListItem):
    draft_json: Dict[str, Any]
    validation_json: Dict[str, Any]
