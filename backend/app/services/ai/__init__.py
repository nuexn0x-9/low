from typing import Optional
from app.core.config import settings
from app.services.ai.provider_base import BaseAIProvider
from app.services.ai.mock_provider import MockAIProvider
from app.services.ai.openai_provider import OpenAIAIProvider
from app.services.ai.low_json_guard import validate_and_guard_ai_patch


def get_ai_provider(provider_name: Optional[str] = None) -> BaseAIProvider:
    provider_key = (provider_name or settings.AI_PROVIDER or "mock").lower().strip()
    if provider_key == "openai" and settings.OPENAI_API_KEY:
        return OpenAIAIProvider()
    return MockAIProvider()


__all__ = [
    "BaseAIProvider",
    "MockAIProvider",
    "OpenAIAIProvider",
    "get_ai_provider",
    "validate_and_guard_ai_patch",
]
