# WhatsApp en Adoptify (chatbot + notificaciones)

Guía para activar **WhatsApp** usando n8n (local o n8n Cloud). El backend ya tiene el servicio
y los endpoints listos; lo que falta es **configurar el proveedor** (Twilio o Meta) y **activar
los workflows** WF-6 y WF-7.

---

## 1. ¿Un workflow o dos?

Se recomiendan **dos workflows separados** (así se hizo):

- **WF-6 WhatsApp Chatbot** — flujo **entrante**: la persona escribe a tu WhatsApp y el bot
  responde (dudas generales + datos personales si está autenticado).
- **WF-7 WhatsApp Notificaciones** — flujo **saliente**: el backend avisa por WhatsApp
  (estado de pedidos, adopciones, avisos a refugios/tiendas, etc.).

Separarlos es más claro y robusto: el chatbot es interactivo (espera/IA) y las notificaciones
son "dispara y olvida".

---

## 2. Arquitectura

```
Persona (WhatsApp) ──> [Proveedor: Twilio/Meta] ──webhook entrante──> WF-6 (n8n)
                                                                        │  identidad (backend /api/ia/whatsapp/contexto)
                                                                        │  responde con Gemini
                                                                        ▼
                                                            Proveedor ──> WhatsApp (respuesta)

Backend (eventos: pedido, adopción...) ──enviar_whatsapp()──> WF-7 (n8n) ──> Proveedor ──> WhatsApp
```

---

## 3. Elegir proveedor

| Proveedor | Uso | Costo |
|---|---|---|
| **Twilio** | Pruebas (Sandbox gratuito) | Gratis para pruebas; el sandbox requiere que cada número envíe "join" una vez. |
| **Meta Cloud API** | Producción | Número de negocio aprobado (se paga por mensaje). |

Para empezar a probar, **Twilio Sandbox** es lo más rápido y gratis.

---

## 4. Configurar Twilio (pruebas)

1. Crea cuenta en https://www.twilio.com (crédito de prueba).
2. Ve a **Messaging → Try it out → Send a WhatsApp message** (o **WhatsApp → Sandbox**).
3. Activa el Sandbox: tu número de prueba (ej. `whatsapp:+14155238886`) y un código `join <palabra>`.
4. En el Sandbox, configura el **"When a message comes in"** (Webhook) con tu webhook de WF-6:
   ```
   https://TU-N8N.app.n8n.cloud/webhook/whatsapp_in
   ```
   (Método: POST).
5. Anota: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` y `TWILIO_WHATSAPP_FROM` (`whatsapp:+14155238886`).

> En el sandbox, cada persona que quiera escribirte debe enviar antes `join <palabra>` a ese número.

---

## 5. Configurar Meta Cloud API (producción)

1. Crea una app en Meta for Developers → **WhatsApp**.
2. Obtén tu **número de negocio** aprobado, el **Phone Number ID** y un **Token** (permanente).
3. Configura el **Webhook** de la app apuntando a `https://TU-N8N.app.n8n.cloud/webhook/whatsapp_in`
   (verifica el campo `messages`).
4. Anota: `META_WHATSAPP_TOKEN`, `META_WHATSAPP_PHONE_ID`, `META_WHATSAPP_VERSION` (ej. `v20.0`).

---

## 6. Configurar variables de entorno

### En n8n (Settings → Environment Variables, o `n8n/.env` en local)

```env
WHATSAPP_PROVIDER=twilio            # twilio | meta
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
META_WHATSAPP_TOKEN=
META_WHATSAPP_PHONE_ID=
META_WHATSAPP_VERSION=v20.0
# (además de las ya existentes: N8N_WEBHOOK_SECRET, BACKEND_PUBLIC_URL, GEMINI_API_KEY...)
```

### En el backend (`backend/.env` o Vercel)

No hace falta nada nuevo para WhatsApp: el backend ya lee `WHATSAPP_PROVIDER`,
`TWILIO_*` / `META_*` (ya están en `config.py`) y enruta vía n8n.

---

## 7. Importar y activar los workflows

En n8n (local o Cloud): **Workflows → Import from File** y **activa**:

- [`WF-6-WhatsApp-Chatbot.json`](workflows/WF-6-WhatsApp-Chatbot.json) → webhook `whatsapp_in`
- [`WF-7-WhatsApp-Notificaciones.json`](workflows/WF-7-WhatsApp-Notificaciones.json) → webhook `enviar_whatsapp`

Ajusta en la UI si hace falta:
- **WF-6** usa el **AI Agent + Google Gemini** (crea/asigna la credencial de Gemini como en WF-3).
- Los nodos HTTP a Twilio/Meta leen las variables de entorno del paso 6.

---

## 8. Identidad y verificación (quién pregunta)

Cuando alguien escribe por WhatsApp, **WF-6 llama al backend**:
`GET {{ BACKEND_PUBLIC_URL }}/api/ia/whatsapp/contexto?telefono=<número>`

- Si ese **número de teléfono está registrado** en una cuenta (usuario, refugio, tienda o empleado),
  el backend lo identifica y devuelve **su rol + sus datos** (pedidos, adopciones, refugio/tienda).
- Si **no está registrado**, el bot responde cosas generales y, si pide datos personales, le indica
  que use el número con el que se registró en la página (o que se registre e ingrese ese número).
- Así, un usuario pregunta "¿estado de mi pedido?" → responde con SUS pedidos; una tienda pregunta
  "¿hay productos agotados?" → responde según el contexto de SU tienda (por ahora el contexto de
  tienda da el nombre y estado; el detalle de stock es un paso siguiente que podemos ampliar).

---

## 9. Enviar notificaciones por WhatsApp desde el backend

El backend tiene el servicio [`app/core/whatsapp.py`](../backend/app/core/whatsapp.py):

```python
from app.core.whatsapp import enviar_whatsapp, whatsapp_activo

if whatsapp_activo():
    enviar_whatsapp("+573001234567", "Tu pedido #PED-00012 cambió a: En camino 🚚")
```

Este servicio enruta a **WF-7** (`enviar_whatsapp`), que envía por Twilio/Meta.

**Dónde conectarlo (recomendado):** en los puntos donde hoy se envían correos o se cambia estado
(pedidos, adopciones, avisos a refugios/tiendas), además del correo, llamar a `enviar_whatsapp`
con el teléfono del destinatario. Puedo dejarlo conectado en los eventos principales cuando me
indiques cuáles priorizar (p. ej. "cambio de estado de pedido", "estado de adopción",
"nueva solicitud para refugio").

---

## 10. Prueba rápida

1. Activa el Sandbox de Twilio (o configura Meta) y escribe `join <palabra>` al número de prueba.
2. Envía "hola" → WF-6 debe responder (revisa **Executions → WF-6**).
3. Desde el backend (o una consola), llama a `enviar_whatsapp(tu_numero, "Prueba de notificación")`
   → revisa **Executions → WF-7**.

---

## 11. Troubleshooting

- **El bot no responde** → revisa que WF-6 esté activo y que el webhook del proveedor apunte a
  `/webhook/whatsapp_in`.
- **"access to env vars denied"** → `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` (en n8n Cloud, si no se
  puede, hay que pasar a Variables `$vars`).
- **No identifica al usuario** → verifica que el número esté guardado igual en el perfil del
  usuario (formato +57 o local; el backend normaliza variantes).
- **No llega el mensaje saliente** → revisa las credenciales del proveedor y que WF-7 esté activo.
