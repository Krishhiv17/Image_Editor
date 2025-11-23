"""
Configuration management for the Photo Editor API.
Loads settings from environment variables.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # App Info
    app_name: str = "Photo Editor API"
    app_version: str = "1.0.0"
    debug: bool = True
    
    # Database
    database_url: str
    
    # JWT Settings
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    
    # Google OAuth
    google_client_id: str
    google_client_secret: str
    google_redirect_uri: str
    
    # Azure Blob Storage
    azure_storage_account_name: str
    azure_storage_account_key: str
    azure_storage_connection_string: str
    blob_container_originals: str = "originals"
    blob_container_variants: str = "variants"
    blob_container_backups: str = "backups"
    
    # CORS
    cors_origins: str = "http://localhost:3000"
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.cors_origins.split(",")]
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False
    )


settings = Settings()
