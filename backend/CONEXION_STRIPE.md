# Integración de pagos con Stripe (Checkout + Webhooks + Connect)

Adoptify usa **Stripe** como su única pasarela de pago online. Esta guía cubre
la configuración, el flujo de pago, Stripe Connect (para que cada tienda reciba
el dinero de sus propias ventas), el webhook, las pruebas y el despliegue.

Documentación oficial utilizada:
- Checkout (hospedado): https://docs.stripe.com/payments/checkout
- Webhooks: https://docs.stripe.com/webhooks
- Connect (cuentas Express): https://docs.stripe.com/connect/express-accounts
- Transfers / separate charges and transfers: https://docs.stripe.com/connect/separate-charges-and-transfers

---

## 1. ¿Por qué este diseño?

- La cuenta de **Adoptify** en Stripe está registrada en **Estados Unidos**, por
  lo que la moneda de cobro es **USD** (`STRIPE_CURRENCY="usd"`).
- El carrito de Adoptify puede contener productos de **varias tiendas y
  refugios** en un mismo pedido. Stripe Checkout solo admite un destino directo
  por cobro (`destination_charge`), por lo que el modelo correcto es
  **"Separate charges and transfers"**:
  1. Adoptify (cuenta de plataforma) cobra el **total** del pedido con Checkout.
  2. Cuando el pago se confirma por webhook, el backend crea una **Transferencia**
     a la cuenta conectada de **cada tienda** por el monto de sus productos menos
     la comisión de la plataforma.
  3. El envío, el descuento y las ventas de **refugios** (o de tiendas sin
     cuenta conectada) se retienen en Adoptify.

- No se usa `destination_charge` porque rompería la contabilidad al mezclar
  varios vendedores en un pedido.

---

## 2. Variables de entorno (backend)

```ini
# Clave secreta del backend (NUNCA en el frontend). Usar claves de TEST en dev.
STRIPE_SECRET_KEY="sk_test_..."

# Secreto del endpoint de webhooks (Dashboard > Developers > Webhooks).
STRIPE_WEBHOOK_SECRET="whsec_..."

# URLs de retorno de Stripe Checkout. Si se dejan vacías se derivan de
# FRONTEND_URL + /pago-resultado. No hardcodear en el código.
STRIPE_SUCCESS_URL=""
STRIPE_CANCEL_URL=""

# Moneda de cobro de Stripe (cuenta registrada en EE.UU. -> usd).
STRIPE_CURRENCY="usd"

# Tasa de conversión COP -> moneda de Stripe (COP por 1 unidad).
# Ej: 4000 significa 1 USD = 4000 COP.
STRIPE_CONVERSION_RATE=4000

# Comisión de la plataforma Adoptify sobre el subtotal de cada tienda (%).
# 0 = sin comisión. 10 = 10%.
STRIPE_PLATFORM_FEE_PERCENT=0
```

> **Nota:** no se necesitan `STRIPE_CONNECT_CLIENT_ID` ni
> `STRIPE_PUBLISHABLE_KEY` porque:
> - Las cuentas conectadas son **Express**, creadas desde el backend con la API
>   key (no se usa el flujo OAuth de cuentas Standard).
> - El Checkout es **alojado** (no se usa Stripe.js en el navegador).

---

## 3. Instalación

```bash
cd backend
pip install -r requirements.txt   # incluye stripe
```

En `requirements.txt` está: `stripe==11.6.0`.

---

## 4. Base de datos (migración)

La tabla `pagos` se **reutiliza** (antes la usaba dLocal). La migración
[`migracion_stripe.sql`](./migracion_stripe.sql) agrega las columnas nuevas y
marca los registros históricos con `proveedor='dlocal'` (no se borran datos).

Columnas nuevas en `pagos`:
- `proveedor` (`'stripe'` | `'dlocal'`)
- `estado_stripe` (estado crudo de Stripe)
- `stripe_checkout_session_id`
- `stripe_payment_intent_id`
- `stripe_amount` (monto en centavos de la moneda de cobro)
- `stripe_currency` (moneda de cobro)
- `comision_plataforma`, `monto_distribuido`, `detalle_distribucion`,
  `stripe_transfer_ids` (distribución a tiendas)
- `respuesta_stripe`, `notificacion`

Columnas nuevas en `tiendas` (Stripe Connect):
- `stripe_account_id` (id de la cuenta conectada, nunca claves del vendedor)
- `stripe_account_status` (`no_configurada` | `pendiente_onboarding` | `lista`)
- `stripe_connect_activa` (bool)

El backend aplica estas migraciones al arrancar (idempotente). También se puede
ejecutar el SQL a mano en el SQL Editor de Supabase.

---

## 5. Flujo de pago (Checkout)

```
Frontend (carrito)
   ↓ POST /api/pedidos  -> crea el pedido en estado "pendiente"
Backend
   ↓ POST /api/pagos/checkout  -> valida propiedad, tiendas Connect y montos
Backend crea la Stripe Checkout Session
   ↓ devuelve { redirect_url }
Frontend redirige al usuario a redirect_url (Checkout alojado de Stripe)
   ↓ usuario paga
Stripe
   ↓ POST /api/pagos/webhook (checkout.session.completed, firmado)
Backend verifica la firma (STRIPE_WEBHOOK_SECRET)
   ↓ marca el pago "pagado", el pedido "pagado"
   ↓ crea Transferencias a cada tienda conectada (menos comisión)
Frontend (página /pago-resultado) consulta el estado REAL del pago
```

**El pedido NO se marca pagado por volver a la `success_url`**: la única
confirmación válida es el webhook de Stripe. La página `/pago-resultado`
consulta `/api/pagos/estado?session_id=...` que devuelve el estado persistido.

---

## 6. Endpoints de pagos

| Método | Ruta | Descripción |
| ------ | ----------------------------- | ------------------------------------------------- |
| POST   | `/api/pagos/checkout`         | Crea una Checkout Session para un pedido (autenticado) |
| POST   | `/api/pagos/webhook`          | Recibe y valida los webhooks de Stripe (firma + idempotente) |
| GET    | `/api/pagos/estado`           | Estado real del pago (`session_id`, `order_id` o `pago_id`) |
| GET    | `/api/pagos/{id}`             | Detalle de un pago propio |
| POST   | `/api/pagos/connect/onboarding` | Inicia el onboarding de Stripe Connect de la tienda |
| GET    | `/api/pagos/connect/estado`   | Estado de la cuenta conectada de la tienda |

Eventos de Stripe procesados:
- `checkout.session.completed` → pago `pagado`, pedido `pagado`, distribución.
- `payment_intent.payment_failed` → pago `fallido`.
- `charge.refunded` → pago `reembolsado`.

Estados internos de `pagos.estado`: `pendiente | procesando | pagado | fallido |
cancelado | reembolsado`.

---

## 7. Stripe Connect (onboarding de tiendas)

Flujo:

```
Tienda (representante / Super Administrador)
   ↓ Sección "Pagos y cobros" en /tienda/configuracion
   ↓ POST /api/pagos/connect/onboarding
Adoptify crea la cuenta conectada (Express) con la API key
   ↓ devuelve URL de AccountLink (onboarding)
Representante completa la información requerida en Stripe
   ↓ Stripe redirige de vuelta a /tienda/configuracion?seccion=pagos
GET /api/pagos/connect/estado verifica en Stripe (charges_enabled + payouts_enabled)
   ↓ si la cuenta está "lista" -> la tienda puede recibir pagos
```

- Solo se almacena `tiendas.stripe_account_id` (nunca claves del vendedor).
- Una tienda que **no** tenga su cuenta Connect lista NO puede cobrar: el
  backend rechaza `/api/pagos/checkout` para pedidos que contengan productos de
  esa tienda, indicando qué tienda falta configurar.
- Cuentas conectadas tipo **Express** (Stripe aloja el onboarding, sin PCI).

---

## 8. Configuración del webhook en Stripe Dashboard

1. En Stripe Dashboard → **Developers → Webhooks → Add endpoint**.
2. URL del endpoint: `https://TU-BACKEND.vercel.app/api/pagos/webhook`
   (en local usa un túnel como ngrok apuntando a `http://localhost:8000`).
3. Eventos a suscribir (mínimos):
   - `checkout.session.completed`
   - `payment_intent.payment_failed`
   - `charge.refunded`
4. Copia el valor de **Signing secret** (`whsec_...`) y ponlo en
   `STRIPE_WEBHOOK_SECRET`.
5. El backend valida la firma con `stripe.Webhook.construct_event`; cualquier
   petición con firma inválida responde `400`.

Para probar el webhook localmente puedes usar la CLI de Stripe:
```bash
stripe listen --forward-to localhost:8000/api/pagos/webhook
stripe trigger checkout.session.completed
```

---

## 9. Pruebas (modo Test)

1. Usa las claves `sk_test_...` / `whsec_...` en las variables de entorno.
2. Configura una cuenta conectada de prueba (Express) y completa su onboarding
   con datos de prueba.
3. Crea un pedido y paga con una tarjeta de prueba de Stripe:
   - `4242 4242 4242 4242` → pago exitoso.
   - `4000 0000 0000 0002` → pago rechazado (fallido).
4. Verifica en el backend que el pedido pasó a `pagado` SOLO después del
   webhook, y que se crearon las transferencias a la cuenta conectada.
5. Prueba el reembolso desde el Dashboard y verifica que el pago pasa a
   `reembolsado`.

Tarjetas de prueba: https://docs.stripe.com/testing

---

## 10. Despliegue en Vercel

Backend (`backend/`):
1. En el proyecto de Vercel, agrega las variables de entorno:
   `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_SUCCESS_URL`,
   `STRIPE_CANCEL_URL`, `STRIPE_CURRENCY`, `STRIPE_CONVERSION_RATE`,
   `STRIPE_PLATFORM_FEE_PERCENT`.
2. Asegúrate de que el endpoint `/api/pagos/webhook` esté accesible en HTTPS.
3. Configura el webhook en Stripe apuntando a la URL de producción.

Frontend (`frontend/`):
- No requiere variables de Stripe (el Checkout es alojado; la Secret Key nunca
  está en el navegador).

---

## 11. Seguridad

- El monto SIEMPRE se recalcula en el backend desde `pedido.total` y
  `pedido_items` (nunca se confía en el frontend).
- El frontend jamás envía el estado del pago ni el monto.
- El webhook verifica la firma; los eventos con firma inválida se rechazan.
- `/api/pagos/checkout`, `/estado` y `/pagos/{id}` validan que el pedido/pago
  pertenezca al usuario autenticado (o sea administrador).
- La creación de Checkout y el procesamiento del webhook son idempotentes
  (no se duplican pagos ni pedidos).
- `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET` solo existen en el backend.

---

## 12. Eliminación de dLocal

La integración con dLocal Go fue eliminada por completo: servicio, endpoints,
schemas, variables `DLOCAL_*`, documentación y migración dedicada. La tabla
`pagos` se reutilizó y sus datos históricos de dLocal se conservan marcados con
`proveedor='dlocal'`. No quedan referencias funcionales a dLocal, ePayco ni
Wompi en el proyecto.
