from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""
    cron_secret: str = ""
    app_url: str = "http://localhost:5173"

    # Agente de saúde financeira (LangChain + Claude via OpenRouter + embeddings locais)
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    health_model: str = "anthropic/claude-sonnet-4.6"
    embed_model: str = "intfloat/multilingual-e5-small"
    # RAG via LlamaIndex sobre os livros em Storage/
    storage_dir: str = "/app/Storage"
    health_index_dir: str = "/app/var/health_index"

    @property
    def cors_origins(self) -> list[str]:
        return [self.app_url, "http://localhost:5173"]


settings = Settings()
