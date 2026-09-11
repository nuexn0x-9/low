from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any, Dict


class DocumentSave(BaseModel):
    lowVersion: Optional[str] = "1.0.0"
    document: Optional[Dict[str, Any]] = None
    frames: Optional[List[Dict[str, Any]]] = None
    expected_revision: Optional[int] = None


class DocumentAutosave(BaseModel):
    lowVersion: Optional[str] = "1.0.0"
    document: Optional[Dict[str, Any]] = None
    frames: Optional[List[Dict[str, Any]]] = None
    expected_revision: Optional[int] = None


class DocumentOut(BaseModel):
    id: str
    project_id: str
    low_version: str
    revision: int
    content: Dict[str, Any]
    created_at: datetime
    updated_at: datetime


class VersionCreate(BaseModel):
    reason: Optional[str] = "manual snapshot"


class VersionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    document_id: str
    version_number: int
    reason: Optional[str] = None
    created_at: datetime


class ValidateImportRequest(BaseModel):
    json_string: Optional[str] = None
    data: Optional[Any] = None


class ValidateImportResponse(BaseModel):
    valid: bool
    low_version: str
    screens_count: int
    total_nodes: int
    errors: List[str] = []
    warnings: List[str] = []
