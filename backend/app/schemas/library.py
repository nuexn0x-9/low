from datetime import datetime
from pydantic import BaseModel
from typing import Optional, List, Any, Dict


class ComponentCreate(BaseModel):
    name: str
    category: Optional[str] = "custom"
    content: Dict[str, Any]
    project_id: Optional[str] = None


class ComponentUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    content: Optional[Dict[str, Any]] = None


class ComponentOut(BaseModel):
    id: str
    owner_id: Optional[str] = None
    project_id: Optional[str] = None
    name: str
    category: Optional[str] = None
    content: Dict[str, Any]
    created_at: datetime
    updated_at: datetime


class TemplateCreate(BaseModel):
    name: str
    category: Optional[str] = "custom"
    content: List[Dict[str, Any]]


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    content: Optional[List[Dict[str, Any]]] = None


class TemplateOut(BaseModel):
    id: str
    owner_id: Optional[str] = None
    name: str
    category: Optional[str] = None
    content: List[Dict[str, Any]]
    is_builtin: bool
    created_at: datetime
    updated_at: datetime
