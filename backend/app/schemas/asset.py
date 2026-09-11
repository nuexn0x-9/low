from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional


class AssetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    owner_id: str
    project_id: Optional[str] = None
    file_name: str
    mime_type: str
    size_bytes: int
    url: str
    created_at: datetime
