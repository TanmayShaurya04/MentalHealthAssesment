import os
from typing import List
from dotenv import load_dotenv

# Automatically load environment variables from .env file
load_dotenv()

class Settings:
    def __init__(self):
        self.PORT: int = int(os.getenv("PORT", "8000"))
        self.ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
        self.CORS_ORIGINS: List[str] = [
            origin.strip() for origin in os.getenv(
                "CORS_ORIGINS",
                "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
            ).split(",") if origin.strip()
        ]
        self.JWT_SECRET: str = os.getenv("JWT_SECRET", "serenova-dev-super-secure-secret-key-32chars")
        self.JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
        self.ACCESS_TOKEN_EXPIRE_DAYS: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_DAYS", "7"))
        
        self.MONGODB_URL: str = os.getenv("MONGODB_URL", "")
        self.DATABASE_NAME: str = os.getenv("DATABASE_NAME", "serenova")
        
        # AI Configuration (LLM-compatible API, default Groq)
        self.AI_PROVIDER: str = os.getenv("AI_PROVIDER", "groq")
        self.AI_BASE_URL: str = os.getenv("AI_BASE_URL", "https://api.groq.com/openai/v1")
        self.AI_MODEL: str = os.getenv("AI_MODEL", "llama-3.3-70b-versatile")
        self.AI_API_KEY: str = os.getenv("AI_API_KEY", "")

settings = Settings()
