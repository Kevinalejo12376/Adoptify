# Conexión de n8n con Adoptify

Guía paso a paso para conectar los workflows de n8n con el backend (FastAPI) y el
frontend (React). **Una sola implementación funciona en local y en producción**:
todo se controla con variables de entorno, no hay código duplicado.

---

## 1. Resumen de la arquitectura

```
Frontend React  ──>  Backend FastAPI  ──(webhook/cola)──>  n8n ──> Gemini
   (chatbot)            |                                    |
                        |  (correos, moderación, sugerencias, SLA)
                        v
                    Supabase/Postgres
```

- El **backend es la fuente de verdad** y el **dueño de la seguridad**.
- **n8n orquesta Y llama a la IA directamente**: consume tareas de la cola
  (`tareas_ia`), construye el prompt, llama a **Gemini** (nodo HTTP con tu
  `GEMINI_API_KEY`), valida el JSON con nodos Code, entrega resultados y envía
  correos. Nunca ejecuta SQL directo contra la base de datos.
- Las **notificaciones in-app** siguen en el backend; n8n solo hace la **entrega
  externa** (correo / WhatsApp / avisos a admins).

---

## 2. Configuración del backend

### 2.1 Variables de entorno (`backend/.env`)

Copia estos valores nuevos (también están en `backend/.env.example`):

```env
# --- n8n ---
N8N_ENABLED=false            # ponlo en true cuando n8n esté listo
N8N_WEBHOOK_URL="http://localhost:5678"
N8N_WEBHOOK_SECRET="cambia_este_token_secreto"   # MISMO valor en n8n/.env
N8N_WEBHOOK_TIMEOUT=30
BACKEND_PUBLIC_URL="http://127.0.0.1:8000"

# --- WhatsApp ---
WHATSAPP_PROVIDER="twilio"
TWILIO_ACCOUNT_SID=""
TWILIO_AUTH_TOKEN=""
TWILIO_WHATSAPP_FROM="whatsapp:+14155238886"
META_WHATSAPP_TOKEN=""
META_WHATSAPP_PHONE_ID=""
META_WHATSAPP_VERSION="v20.0"

# --- Chatbot ---
CHAT_MAX_HISTORIAL=10
CHAT_RUTAS_PERMITIDAS='["/", "/adoptar", "/refugios", "/tienda", "/foro", "/mis-pedidos", "/favoritos", "/login", "/registrar-refugio"]'
```

> **Importante:** `N8N_WEBHOOK_SECRET` debe ser **exactamente el mismo** en
> `backend/.env` y en `n8n/.env`. Genera uno con:
> `python -c "import secrets; print(secrets.token_urlsafe(32))"`

### 2.2 Base de datos

Ejecuta [`backend/migracion_n8n_ia.sql`](../backend/migracion_n8n_ia.sql) en
Supabase (SQL Editor) o en tu Postgres. Crea:

- `tareas_ia` (cola de tareas de IA)
- `chat_sesiones` y `chat_mensajes` (historial del chatbot)
- columna `notif_whatsapp` en `configuraciones`

> En local (SQLite) las tablas se crean solas al arrancar el backend.

### 2.3 Comportamiento

- **Correos:** el backend envía **directamente por Brevo** (`_enviar_correo` usa la
  API de Brevo como método principal). n8n solo se usa como fallback si
  `BREVO_API_KEY` está vacío.
- Si `N8N_ENABLED=false`, no se disparan webhooks y no se crean tareas de IA.
- Si `N8N_ENABLED=true`, se disparan los webhooks de n8n (correos, moderación,
  clasificación, sugerencias, chatbot) y se crean tareas de IA.
- **Chatbot:** si n8n no responde (o el workflow WF-3 falla), el backend tiene un
  **fallback local**: llama a Gemini directamente para no dejar al usuario sin respuesta.

---

## 3. Configuración de n8n

### 3.1 Variables de entorno (`n8n/.env`)

```env
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=TU_CONTRASEÑA
GENERIC_TIMEZONE=America/Bogota
TZ=America/Bogota

N8N_WEBHOOK_SECRET=cambia_este_token_secreto   # MISMO que en backend/.env
BACKEND_PUBLIC_URL=http://127.0.0.1:8000
GEMINI_API_KEY=TU_CLAVE_GEMINI                  # la misma de backend/.env
SMTP_FROM=tu_correo@gmail.com
ADMIN_EMAIL=admin@adoptify.com
```

Reinicia n8n tras cambiar `.env`:
```bash
cd n8n
docker compose restart
```

### 3.2 Importar los workflows

En la interfaz de n8n (`http://localhost:5678`):

1. **Workflows → Import from File** y selecciona cada JSON de
   [`n8n/workflows/`](workflows):
   - `WF-1-Notificaciones.json`
   - `WF-2-Moderacion.json`
   - `WF-3-Chatbot.json`
   - `WF-4-Sugerencias-IA.json`
   - `WF-5-Operaciones.json`
2. Abre cada workflow y haz clic en **Save** (o guarda con Ctrl+S).

### 3.3 Credenciales que DEBES crear (una sola vez, en n8n UI)

1. **SMTP** (`Credentials → New → SMTP`): host, puerto (587), usuario y
   **contraseña de aplicación** de Gmail (la misma que usas en `backend/.env`).
   Nómbrala `SMTP`. Asígnala a los nodos "Enviar correo SMTP" de WF-1 y WF-5
   (el JSON ya apunta a una credencial llamada `SMTP`; si la llamas distinto,
   remapea en el nodo).
2. **Google Gemini**: NO necesitas credencial OAuth. Los workflows WF-2, WF-3 y
   WF-4 llaman a Gemini **directamente** usando `GEMINI_API_KEY` desde `n8n/.env`
   (la misma que usas en `backend/.env`). Solo reinicia n8n tras añadirla.

### 3.4 Verificar los webhooks (importante en local)

Para que el backend dispare a n8n, la URL de los webhooks debe ser alcanzable:

- **Local (todo en tu PC):** `http://localhost:5678` funciona si backend y n8n
  corren en la misma máquina. El backend envía a
  `http://localhost:5678/webhook/enviar_correo`, etc.
- **Producción:** n8n debe estar **expuesto públicamente** (depliega n8n en
  Railway/Render/Fly o usa un túnel como Cloudflare Tunnel/ngrok para pruebas).
  Entonces `N8N_WEBHOOK_URL=https://tu-n8n.com`.

> Los webhooks que n8n **escucha** son: `enviar_correo` (WF-1) y `chatbot` (WF-3).
> WF-2, WF-4 y WF-5 **consultan la cola** por polling (no reciben webhooks).

---

## 4. Flujo de cada workflow

| Workflow | Trigger | Qué hace |
|---|---|---|
| **WF-1 Notificaciones** | Webhook `enviar_correo` | Recibe el correo (to/asunto/html) del backend y lo envía por SMTP con n8n. Aquí puedes añadir luego WhatsApp (nodo Twilio/Meta) |
| **WF-2 Moderación** | Schedule (cada 1 min) | Consume tareas `moderar_*` y `clasificar_*`, construye el prompt y llama a **Gemini directamente** en n8n; valida el JSON y entrega el resultado. Si un post es inapropiado, el backend lo oculta + notifica/emails al autor |
| **WF-3 Chatbot** | Webhook `chatbot` | Recibe el mensaje, obtiene su contexto seguro (pedidos), construye el prompt y **Gemini genera la respuesta en n8n**; devuelve `{respuesta, accion}` al frontend |
| **WF-4 Sugerencias IA** | Schedule (cada 2 min) | Consume tareas `sugerir_*` y `matching`, llama a **Gemini directamente** para descripciones/hashtags/recomendaciones y guarda el resultado |
| **WF-5 Operaciones** | Schedule (diario 08:00) | Consulta solicitudes de refugio pendientes >72h (SLA) y avisa a admins por correo |

---

## 5. Prueba rápida end-to-end

1. Asegúrate de que backend y n8n estén corriendo.
2. Pon `N8N_ENABLED=true` en `backend/.env` y reinicia el backend.
3. En n8n, abre **WF-1**, actívalo (toggle) y copia la URL del webhook
   (`http://localhost:5678/webhook/enviar_correo`).
4. Desde el backend, cualquier correo (p. ej. registrar un usuario) debe llegar
   por n8n. Revisa **Executions** en n8n para ver si entró.
5. Para el chatbot: abre el frontend (`http://localhost:5173`), pulsa el botón
   flotante abajo a la derecha y escribe "hola". Si WF-3 está activo, responde.
6. Crea un post en el foro con contenido inapropiado: WF-2 lo detectará, el post
   quedará archivado y el autor recibirá notificación + correo con el motivo.

---

## 6. Reglas de fiabilidad implementadas

- **La IA sugiere/clasifica, no decide**: ocultar contenido solo cuando
  `decision=ocultar` (n8n pasa el resultado; el backend aplica la acción).
- **Salida validada**: cada workflow valida el JSON que devuelve Gemini con un
  nodo Code (extrae el texto, limpia markdown y hace `JSON.parse`) antes de
  entregar el resultado o responder al webhook.
- **Cola en BD como fuente de verdad**: si n8n se cae, las tareas quedan
  `pendiente` y se retoman al volver (idempotente).
- **Webhooks protegidos**: todos los endpoints de servicio exigen el header
  `X-N8N-Token` con el secreto compartido.
- **n8n nunca toca la BD**: toda consulta de datos pasa por `/api/ia/*`
  (contexto, preferencias, cola, SLA). La IA la llama n8n directamente.
- **Los códigos de verificación/reset siguen en el backend** (nunca por n8n).

---

## 7. Cómo activar WhatsApp (opcional)

1. **Pruebas (gratis):** Twilio Sandbox. En Twilio → Messaging → *Try it out* →
   *Send a WhatsApp message* obtienes `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`
   y el número `whatsapp:+14155238886`. El usuario debe enviar un mensaje al
   sandbox para activarlo.
2. **Producción:** Meta Cloud API (número de negocio aprobado) con
   `META_WHATSAPP_TOKEN`, `META_WHATSAPP_PHONE_ID`.
3. En **WF-1**, añade un nodo `Twilio` (o `Http Request` a Meta) conectado tras
   el webhook, y condicionalo con `$env.WHATSAPP_PROVIDER` y la preferencia
   `notif_whatsapp` del usuario (endpoint `/api/ia/usuarios/{id}/preferencias`).

> El campo `notif_whatsapp` ya existe en `configuraciones` (opt-in del usuario)
> y se expone en la API de preferencias para que n8n lo respete.

---

## 8. Notas sobre los JSON de workflows

- Los archivos en [`n8n/workflows/`](workflows) son importables tal cual.
- Si al importar algún nodo pide ajustar un campo (p. ej. el nombre de la
  credencial SMTP), edítalo en la UI de n8n; es un cambio de 1 minuto.
- Los nodos `HTTP Request` usan `$env.BACKEND_PUBLIC_URL` y
  `$env.N8N_WEBHOOK_SECRET`, así que **no hay que editar URLs al pasar a
  producción**: solo cambias los valores en `n8n/.env`.
