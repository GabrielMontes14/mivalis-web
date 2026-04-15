from pydantic_settings import BaseSettings
from typing import Optional
from pathlib import Path

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    DEBUG: bool = False
    
    # Auth
    JWT_SECRET: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 720  # 12 hours
    
    # OpenAI
    OPENAI_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None

    
    # Email (SMTP)
    MAIL_USERNAME: Optional[str] = None
    MAIL_PASSWORD: Optional[str] = None
    MAIL_FROM: Optional[str] = None
    MAIL_PORT: int = 587
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_FROM_NAME: str = "Bodega Mayorista"
    MAIL_STARTTLS: bool = True
    MAIL_SSL_TLS: bool = False
    
    # Paths
    BASE_DIR: Path = Path(__file__).resolve().parent
    TEMPLATE_FOLDER: Path = BASE_DIR / "templates" / "email"

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"

settings = Settings()
