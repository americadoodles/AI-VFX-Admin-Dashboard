import os
from typing import Optional

from dotenv import load_dotenv

load_dotenv()


class Settings:
    # PostgreSQL connection (Google Cloud SQL)
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/ai_vfx",
    )
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    ADMIN_API_PREFIX: str = os.getenv("ADMIN_API_PREFIX", "/admin")

    # Connection pool settings
    DB_POOL_SIZE: int = int(os.getenv("DB_POOL_SIZE", "5"))
    DB_MAX_OVERFLOW: int = int(os.getenv("DB_MAX_OVERFLOW", "10"))
    DB_POOL_TIMEOUT: int = int(os.getenv("DB_POOL_TIMEOUT", "30"))

    # Google Cloud SQL settings (for Cloud SQL Auth Proxy connection)
    CLOUD_SQL_CONNECTION_NAME: str = os.getenv("CLOUD_SQL_CONNECTION_NAME", "")


settings = Settings()
