from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "TEMSA Digital Twin"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    DATABASE_URL: str = "postgresql+asyncpg://temsa:temsa_secure_2024@db:5432/temsa_twin"
    DATABASE_URL_SYNC: str = "postgresql://temsa:temsa_secure_2024@db:5432/temsa_twin"
    REDIS_URL: str = "redis://redis:6379/0"
    VECTO_IMPORT_DIR: str = "/app/vecto_files"

    class Config:
        env_file = ".env"


settings = Settings()
