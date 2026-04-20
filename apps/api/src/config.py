from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""
    cron_secret: str = ""
    app_url: str = "http://localhost:5173"

    @property
    def cors_origins(self) -> list[str]:
        return [self.app_url, "http://localhost:5173"]


settings = Settings()
