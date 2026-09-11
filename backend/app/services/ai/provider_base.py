from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, Tuple


class BaseAIProvider(ABC):
    provider_name: str = "unknown"
    model_name: str = "unknown"

    @abstractmethod
    async def generate_low_patch(
        self,
        prompt: str,
        result_type: str,
        frame_preset: Optional[Dict[str, Any]] = None,
    ) -> Tuple[Dict[str, Any], Optional[Dict[str, Any]]]:
        """
        Generate a LOW JSON document patch based on a user prompt.
        Returns a tuple of (raw_patch, usage_info).
        """
        pass
