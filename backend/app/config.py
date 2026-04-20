from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "TEMSA Digital Twin"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    DATABASE_URL: str = "postgresql+asyncpg://temsa:temsa_secure_2024@db:5432/temsa_twin"
    DATABASE_URL_SYNC: str = "postgresql://temsa:temsa_secure_2024@db:5432/temsa_twin"
    REDIS_URL: str = "redis://redis:6379/0"
    VECTO_IMPORT_DIR: str = "/app/vecto_files"

    # Auth / JWT
    SECRET_KEY: str = "temsa-digital-twin-secret-key-change-in-production-2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours

    class Config:
        env_file = ".env"


settings = Settings()
