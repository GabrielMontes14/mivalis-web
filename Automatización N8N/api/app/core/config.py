"""
Configuración global de la aplicación
Carga variables de entorno y las valida usando Pydantic Settings
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Literal


class Settings(BaseSettings):
    """Configuración de la aplicación desde variables de entorno"""
    
    # ── Configuración general ──
    ENVIRONMENT: Literal["development", "production"] = "development"
    LOG_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    
    # ── Supabase ──
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str
    SUPABASE_JWT_SECRET: str
    
    # ── n8n API (comunicación interna) ──
    N8N_API_URL: str
    N8N_API_KEY: str
    N8N_BASIC_AUTH_USER: str = ""
    N8N_BASIC_AUTH_PASSWORD: str = ""
    
    # ── Paths ──
    TEMPLATES_DIR: str = "/app/templates"
    
    # ── Configuración de retry para despliegues ──
    DEPLOY_MAX_RETRIES: int = 3
    DEPLOY_BACKOFF_BASE: int = 2  # segundos (2^1, 2^2, 2^3)
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )


# Instancia global de configuración
settings = Settings()
