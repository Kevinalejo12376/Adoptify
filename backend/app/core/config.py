# pyrefly: ignore [missing-import]
import json
# pyrefly: ignore [missing-import]
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional, Union


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    CORS_ORIGINS: Union[str, List[str]] = ["*"]
    GEMINI_API_KEY: str = ""

    # --- Cloudinary (imágenes temporales y permanentes) ---
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    # --- UPCitemDB (búsqueda por código de barras) ---
    # Opcional. Si no se configura, solo se usará OpenFoodFacts.
    # Obtener API Key en: https://upcitemdb.com/
    UPCITEMDB_API_KEY: str = ""

    # --- Brevo (Sendinblue) — envío de correos ---
    # API Key v3 (xkeysib-...) en: https://app.brevo.com/settings/keys/smtp
    BREVO_API_KEY: str = ""
    BREVO_FROM_EMAIL: str = "adoptifyoficial@gmail.com"
    BREVO_FROM_NAME: str = "Adoptify"

    # --- Frontend ---
    FRONTEND_URL: str = "http://localhost:5173"

    # --- Google OAuth ---
    GOOGLE_CLIENT_ID: str = ""

    # --- Facebook OAuth ---
    FACEBOOK_APP_ID: Optional[str] = None
    FACEBOOK_APP_SECRET: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def get_cors_origins(self) -> List[str]:
        if isinstance(self.CORS_ORIGINS, str):
            try:
                return json.loads(self.CORS_ORIGINS)
            except json.JSONDecodeError:
                return [self.CORS_ORIGINS]
        return self.CORS_ORIGINS

    @property
    def allow_credentials(self) -> bool:
        return "*" not in self.get_cors_origins


settings = Settings()
