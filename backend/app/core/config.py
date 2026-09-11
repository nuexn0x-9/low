from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    APP_NAME: str = "LOW"
    APP_ENV: str = "development"
    DATABASE_URL: str = "sqlite+aiosqlite:///./low.db"
    ASSET_STORAGE_PATH: str = "./storage/assets"
    JWT_SECRET: str = "low-dev-secret-key-change-in-production-1234567890"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    CORS_ORIGINS: str = "*"
    AGENT_SESSION_EXPIRE_MINUTES: int = 1440  # 24 hours
    ALLOW_DEV_LOCAL_USER: bool = True

    # Phase 3 & 4: AI Import Engine Settings
    AI_PROVIDER: str = "mock"  # "mock" | "openai"
    OPENAI_API_KEY: str = ""
    AI_MODEL: str = "gpt-4o-mini"
    AI_MAX_OUTPUT_TOKENS: int = 4000
    AI_REQUEST_TIMEOUT_SECONDS: float = 30.0
    AI_MAX_RETRIES: int = 2

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parent.parent.parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origin_list(self) -> List[str]:
        if not self.CORS_ORIGINS or self.CORS_ORIGINS.strip() == "*":
            return ["*"]
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
