# Conexión de Adoptify con n8n Cloud

Guía para usar **n8n Cloud** (n8n.io, el servicio alojado) con Adoptify, manteniendo el
**respaldo interno** del backend: si n8n Cloud responde, se usa n8n Cloud; si no responde o
falla, el backend usa **Brevo** (correos) y **Gemini interno** (chatbot). Así el sistema
funciona siempre, incluso si n8n Cloud está caído o no configurado.

---

## 1. Arquitectura resultante

```
Frontend React (Vercel)  ──>  Backend FastAPI (Vercel)  ──(webhook)──>  n8n Cloud
                                                                          │
                                                                          │ (si no responde)
                                                                          ▼
                              Respaldo interno: Brevo (correos) / Gemini (chatbot)
```

- El backend intenta n8n Cloud primero (`N8N_ENABLED=true`).
- Si el webhook de n8n Cloud no responde (timeout/error), el backend cae al respaldo interno.
- Esto ya está implementado en el código ([`email.py`](../backend/app/core/email.py) y
  [`ia.py`](../backend/app/api/routers/ia.py)); no requiere cambios de código.

---

## 2. Crear la instancia de n8n Cloud

1. Crea una cuenta en **https://n8n.io** → **Sign up** (hay plan gratuito de prueba y planes de pago).
2. Ve a **n8n Cloud** y crea tu instancia (el botón "Create cloud instance").
3. Anota tu **URL de instancia**, con formato:
   ```
   https://TU-NOMBRE.app.n8n.cloud
   ```
   Esta URL será tu `N8N_WEBHOOK_URL` en el backend (sin `/webhook`).

---

## 3. Importar los workflows

En tu instancia de n8n Cloud (**Workflows → Import from File**), importa y guarda (Ctrl+S) y
**activa** (toggle) cada uno de estos archivos:

- [`WF-1-Notificaciones.json`](workflows/WF-1-Notificaciones.json) → webhook `enviar_correo`
- [`WF-2-Moderacion.json`](workflows/WF-2-Moderacion.json) → schedule (cada 1 min)
- [`WF-3-Chatbot.json`](workflows/WF-3-Chatbot.json) → webhook `chatbot` (usa AI Agent + Gemini)
- [`WF-4-Sugerencias-IA.json`](workflows/WF-4-Sugerencias-IA.json) → schedule (cada 2 min)
- [`WF-5-Operaciones.json`](workflows/WF-5-Operaciones.json) → schedule (diario 08:00)

> Los workflows leen variables con `$env.*`. En n8n Cloud se configuran en
> **Settings → Environment Variables** (ver paso 4).

---

## 4. Configurar las variables de entorno en n8n Cloud

En **Settings → Environment Variables** de tu instancia, agrega EXACTAMENTE estas:

| Variable | Valor |
|---|---|
| `N8N_WEBHOOK_SECRET` | Un token secreto (genera uno con `python -c "import secrets; print(secrets.token_urlsafe(32))"`). **DEBE ser el mismo** que pongas en el backend. |
| `BACKEND_PUBLIC_URL` | La URL pública de tu backend. Si está en Vercel: `https://TU-BACKEND.vercel.app`. Si pruebas local, usa un túnel (ngrok/cloudflared) apuntando a `http://localhost:8000`. |
| `GEMINI_API_KEY` | Tu clave de Google Gemini (la misma de `backend/.env`). |
| `BREVO_API_KEY` | Tu API Key de Brevo (la misma de `backend/.env`). |
| `BREVO_FROM_EMAIL` | `adoptifyoficial@gmail.com` (o el que uses). |
| `BREVO_FROM_NAME` | `Adoptify`. |
| `ADMIN_EMAIL` | Correo del administrador (avisos SLA, WF-5). |
| `SMTP_FROM` | `adoptifyoficial@gmail.com` (WF-1/WF-5). |
| `N8N_BLOCK_ENV_ACCESS_IN_NODE` | **`false`** (para que los nodos puedan leer `$env.*`). |

> **Si n8n Cloud no te deja cambiar `N8N_BLOCK_ENV_ACCESS_IN_NODE`** (bloqueado por seguridad),
> los workflows fallarán con "access to env vars denied". En ese caso avísame y convierto los
> `$env.*` a **Variables de n8n** (`$vars.*`, en Settings → Variables), que sí se pueden usar
> en los nodos.

---

## 5. Crear credenciales en n8n Cloud

- **WF-3 (Chatbot)** usa el nodo **AI Agent + Google Gemini**. Necesita una credencial:
  - **Credentials → Add credential → "Google Gemini" (o Google Gemini(PaLM) Api)** → pega tu
    `GEMINI_API_KEY`.
  - Abre el nodo "AI Agent" → en el subnodo "Google Gemini" selecciona esa credencial.
- **WF-1 y WF-5** usan el nodo HTTP a Brevo con `$env.BREVO_API_KEY` (no necesitan credencial SMTP).

---

## 6. Configurar el backend para apuntar a n8n Cloud

Edita `backend/.env` (local) o las variables de entorno en **Vercel** (producción):

```env
N8N_ENABLED=true
N8N_WEBHOOK_URL="https://TU-NOMBRE.app.n8n.cloud"
N8N_WEBHOOK_SECRET="EL MISMO token del paso 4"
N8N_WEBHOOK_TIMEOUT=45
```

- **Local:** `BACKEND_PUBLIC_URL` en n8n Cloud debe apuntar a un túnel de tu backend local.
- **Producción (Vercel):** `BACKEND_PUBLIC_URL` en n8n Cloud = `https://TU-BACKEND.vercel.app`.
- Reinicia el backend (o redeploya en Vercel) tras cambiar estas variables.

---

## 7. Verificar el webhook (n8n Cloud)

Cada workflow activo con webhook expone una URL pública:
`https://TU-NOMBRE.app.n8n.cloud/webhook/enviar_correo` y `.../webhook/chatbot`.

- **Correos:** desde el backend, cualquier correo (registro, código, etc.) debe salir por n8n Cloud.
  Revisa **Executions → WF-1** en la nube para ver si entró.
- **Chatbot:** escribe en el chat del frontend; revisa **Executions → WF-3**.

## 8. Comportamiento de respaldo (verificación)

- Si n8n Cloud **responde** → correos y chatbot pasan por la nube.
- Si n8n Cloud **no responde o falla** (instancia apagada, timeout, error) → el backend usa
  **Brevo** (correos) y **Gemini interno** (chatbot) automáticamente. No se rompe nada.

Para probarlo: detén/apaga la instancia de n8n Cloud y envía un correo de prueba → debe llegar
por Brevo igualmente.

---

## 9. Troubleshooting

- **"access to env vars denied"** → revisa `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` (paso 4); si no
  se puede, migrar a `$vars`.
- **Webhook 404** → el workflow no está activo en la nube (toggle) o el path no coincide
  (`enviar_correo`, `chatbot`).
- **Chatbot cae al fallback siempre** → revisa `N8N_WEBHOOK_TIMEOUT` (en n8n Cloud la respuesta
  tarda más) y que WF-3 esté activo con la credencial de Gemini asignada.
- **WF-2/WF-4 no procesan tareas** → verifica `BACKEND_PUBLIC_URL` y que el schedule esté activo.
