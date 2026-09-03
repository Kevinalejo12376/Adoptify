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

    # --- n8n (automatizaciones / IA asíncrona / notificaciones) ---
    # N8N_ENABLED: si es "true", el backend dispara webhooks a n8n y enruta
    # los correos por n8n. Si es falso/vacío, todo sigue como antes (SMTP local).
    N8N_ENABLED: bool = False
    # URL base de los webhooks de n8n. Local: http://localhost:5678
    # Produccion: https://TU-N8N-PUBLICO.com
    N8N_WEBHOOK_URL: str = ""
    # Token secreto compartido backend <-> n8n (mismo valor en n8n/.env)
    N8N_WEBHOOK_SECRET: str = ""
    # Tiempo máximo (seg) que el backend espera la respuesta de un webhook n8n
    N8N_WEBHOOK_TIMEOUT: int = 30
    # URL pública del backend (para que n8n llame a la API). Local: http://127.0.0.1:8000
    BACKEND_PUBLIC_URL: str = "http://127.0.0.1:8000"

    # --- WhatsApp (notificaciones externas, opt-in del usuario) ---
    # twilio | meta . En pruebas usa twilio (sandbox gratis); en produccion meta.
    WHATSAPP_PROVIDER: str = "twilio"
    # Twilio
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_WHATSAPP_FROM: str = "whatsapp:+14155238886"
    # Meta Cloud API
    META_WHATSAPP_TOKEN: str = ""
    META_WHATSAPP_PHONE_ID: str = ""
    META_WHATSAPP_VERSION: str = "v20.0"

    # --- Chatbot ---
    # Ventana de historial (mensajes) que se envía al workflow de n8n como contexto
    CHAT_MAX_HISTORIAL: int = 10
    # Rutas permitidas que el chatbot puede sugerir navegar (lista blanca).
    # Deben coincidir con las rutas REALES del frontend (ver App.jsx).
    CHAT_RUTAS_PERMITIDAS: str = '["/", "/animals", "/shelters", "/store", "/forum", "/mis-pedidos", "/favoritos", "/login", "/register", "/registrar-refugio", "/registrar-tienda"]'

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

    # --- dLocal (pasarela de pagos online) ---
    # Adoptify cobra en Colombia (COP). Las claves SOLO se usan desde el backend;
    # NUNCA se exponen al frontend (no usar VITE_ para credenciales secretas).
    # Credenciales de dLocal Go (dashboard):
    #   DLOCAL_API_KEY    -> API Key (forma el Bearer token junto con la Secret)
    #   DLOCAL_SECRET_KEY -> Secret Key (Bearer token API:SECRET y verificación
    #                        del webhook si aplica)
    #   DLOCAL_SMARTFIELDS_API_KEY -> solo si usas SmartFields
    DLOCAL_ENV: str = "sandbox"  # sandbox | prod
    DLOCAL_API_KEY: str = ""
    DLOCAL_SECRET_KEY: str = ""
    DLOCAL_SMARTFIELDS_API_KEY: str = ""
    # URL pública del webhook de dLocal: https://TU-BACKEND/api/pagos/webhook
    DLOCAL_WEBHOOK_URL: str = ""
    # callback_url/notification_url enviadas a dLocal en el checkout. Si se
    # dejan vacías se derivan de DLOCAL_WEBHOOK_URL o BACKEND_PUBLIC_URL.
    DLOCAL_CALLBACK_URL: str = ""
    # País y moneda de cobro (Colombia) -> van en el JSON del pago (no en headers).
    DLOCAL_COUNTRY: str = "CO"
    DLOCAL_CURRENCY: str = "COP"

    @property
    def dlocal_success_url(self) -> str:
        """URL de éxito del Checkout (no es fuente de verdad del pago)."""
        front = self.FRONTEND_URL.rstrip("/")
        return f"{front}/pago-resultado?resultado=success"

    @property
    def dlocal_back_url(self) -> str:
        """URL de regreso/cancelación del Checkout (back_url de dLocal Go)."""
        front = self.FRONTEND_URL.rstrip("/")
        return f"{front}/pago-resultado?resultado=cancel"

    @property
    def dlocal_callback_url(self) -> str:
        """URL a la que dLocal envía las notificaciones (webhook)."""
        if self.DLOCAL_CALLBACK_URL.strip():
            return self.DLOCAL_CALLBACK_URL.strip()
        if self.DLOCAL_WEBHOOK_URL.strip():
            return f"{self.DLOCAL_WEBHOOK_URL.strip().rstrip('/')}/api/pagos/webhook"
        return f"{self.BACKEND_PUBLIC_URL.rstrip('/')}/api/pagos/webhook"

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

    @property
    def get_rutas_permitidas(self) -> List[str]:
        """Lista blanca de rutas que el chatbot puede sugerir navegar."""
        if isinstance(self.CHAT_RUTAS_PERMITIDAS, str):
            try:
                return json.loads(self.CHAT_RUTAS_PERMITIDAS)
            except json.JSONDecodeError:
                return [self.CHAT_RUTAS_PERMITIDAS]
        return self.CHAT_RUTAS_PERMITIDAS


settings = Settings()
