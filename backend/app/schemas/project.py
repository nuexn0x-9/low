from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any, Dict


class ProjectCreate(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = "Untitled"
    description: Optional[str] = None
    frames: Optional[List[Dict[str, Any]]] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    thumbnail_asset_id: Optional[str] = None


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    owner_id: str
    name: str
    description: Optional[str] = None
    thumbnail_asset_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    screens_count: Optional[int] = 0
