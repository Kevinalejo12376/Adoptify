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

    # --- Proveedor de IA (chat compatible con OpenAI — Alibaba Cloud Model Studio) ---
    # Reemplaza a Google Gemini. Usa un endpoint OpenAI-compatible (chat/completions)
    # con el header "Authorization: Bearer <IA_API_KEY>".
    IA_API_KEY: str = ""
    # Base URL del endpoint OpenAI-compatible (SIN /chat/completions)
    IA_BASE_URL: str = "https://ws-9et9wwpkt1bcidj8.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1"
    # Modelo a usar en el campo "model" de cada petición
    IA_MODEL: str = "qwen-max"

    # --- OpenRouter (proveedor PRINCIPAL de IA) ---
    # API compatible con OpenAI: POST {OPENROUTER_BASE_URL}/chat/completions.
    # Reemplaza al proveedor anterior (Alibaba Cloud) como cliente por defecto.
    # La API key SOLO se usa desde el backend; NUNCA en frontend (no VITE_).
    OPENROUTER_API_KEY: str = ""
    # Base URL sin /chat/completions
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    # Modelo preferido (primer elemento de la cadena "models" de OpenRouter).
    # Debe ser multimodal (visión) para que "Analizar producto con IA" funcione.
    # Por defecto se usa un gratuito CONFIABLE verificado (2026-09) con la cuenta
    # en $0. Para mayor calidad o concurrencia, cámbialo por un modelo de pago
    # (p. ej. google/gemini-2.0-flash-001) cuando la cuenta tenga créditos.
    OPENROUTER_MODEL: str = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"
    # Modelos de reserva separados por coma (se añaden tras el principal).
    # OpenRouter prueba cada modelo en orden si el anterior no puede atender.
    # IMPORTANTE: deben ser IDs que EXISTAN en el catálogo actual de OpenRouter.
    # Verificados 2026-09 (respuesta + JSON válido con la cuenta en $0):
    #   - google/gemma-4-31b-it:free  (visión, mejor calidad; a veces 429)
    #   - nvidia/nemotron-3-ultra-550b-a55b:free (texto, muy fiable)
    # (minimax/minimax-m3:free ya NO existe como gratuito -> 404.)
    OPENROUTER_FALLBACK_MODELS: str = (
        "google/gemma-4-31b-it:free,"
        "nvidia/nemotron-3-ultra-550b-a55b:free"
    )
    # Modelos con SOPORTE DE IMÁGENES (visión) separados por coma. Se usan en
    # "Analizar producto con IA" (peticiones multimodales) para NO enviar una
    # imagen a un modelo de solo texto (que devolvería 404). Si está vacío se usa
    # la cadena completa (OPENROUTER_MODEL + fallbacks).
    OPENROUTER_VISION_MODELS: str = (
        "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free,"
        "google/gemma-4-31b-it:free"
    )
    # Cabeceras opcionales que OpenRouter usa para ranking/atribución.
    OPENROUTER_SITE_URL: str = ""
    OPENROUTER_SITE_NAME: str = "Adoptify"

    # --- Proveedor de IA ALTERNATIVO (respaldo cuando OpenRouter falla) ---
    # Debe ser un endpoint OpenAI-compatible (POST /chat/completions) para
    # reutilizar el mismo transporte (Groq, Google Gemini compatible-mode,
    # Alibaba Cloud, Together, etc.). Si está activo, el backend intenta primero
    # OpenRouter y, si falla (429/402/403/5xx/timeout), prueba este proveedor.
    # Las claves SOLO se usan desde el backend; NUNCA en frontend.
    IA_FALLBACK_ENABLED: bool = False
    IA_FALLBACK_API_KEY: str = ""
    # Base URL SIN /chat/completions
    IA_FALLBACK_BASE_URL: str = ""
    IA_FALLBACK_MODEL: str = ""
    # Tiempo máximo (seg) de espera para el proveedor alternativo.
    IA_FALLBACK_TIMEOUT: float = 60.0

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

    @property
    def dlocal_callback_url_donaciones(self) -> str:
        """URL del webhook de dLocal para DONACIONES (endpoint propio)."""
        if self.DLOCAL_WEBHOOK_URL.strip():
            return f"{self.DLOCAL_WEBHOOK_URL.strip().rstrip('/')}/api/donaciones/pagos/webhook"
        return f"{self.BACKEND_PUBLIC_URL.rstrip('/')}/api/donaciones/pagos/webhook"

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

    @property
    def openrouter_fallback_list(self) -> List[str]:
        """Lista de modelos de reserva (OPENROUTER_FALLBACK_MODELS separados por coma)."""
        if not self.OPENROUTER_FALLBACK_MODELS:
            return []
        return [
            m.strip()
            for m in str(self.OPENROUTER_FALLBACK_MODELS).split(",")
            if m.strip()
        ]

    @property
    def openrouter_vision_list(self) -> List[str]:
        """Lista de modelos con visión (OPENROUTER_VISION_MODELS separados por coma)."""
        if not self.OPENROUTER_VISION_MODELS:
            return []
        return [
            m.strip()
            for m in str(self.OPENROUTER_VISION_MODELS).split(",")
            if m.strip()
        ]


settings = Settings()
