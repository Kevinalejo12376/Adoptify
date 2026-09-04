# UUID en rutas públicas — Auditoría

Fecha: 2026-09-03

## Contexto
Las tablas `mascotas` y `productos` usaban únicamente `id BIGSERIAL`, por lo que
las URLs públicas de detalle mostraban el id numérico (`/animal/22`,
`/product/31`). Se agregó una columna `uuid` (UUID v4) como **identificador
público** manteniendo el `id` numérico como PK y FK interna (favoritos,
solicitudes, reseñas, pedidos, kardex, paneles internos).

## Migración
- SQL para Supabase/PostgreSQL: [`migracion_uuid_publico.sql`](migracion_uuid_publico.sql)
  (idempotente; ALTER + backfill `gen_random_uuid()` + índice único + NOT NULL + default).
- Automática en el arranque (ambos motores): paso `_migrar_uuid_publico` en
  [`main.py`](app/main.py) (`_run_migrations`), incluida la rama SQLite local.

## Cambios aplicados (implementados)
- Modelos `Mascota` y `Producto`: columna `uuid String(36)` única con default uuid4.
- Serializers (`serialize_mascota`, `serialize_producto`) y schemas de respuesta
  (`MascotaResponse`, `ProductoResponse`) exponen `uuid` (defensivo: opcional).
- Detalle público `GET /api/mascotas/{id}` y `GET /api/productos/{id}` resuelven
  por `uuid` **o** por id numérico (compatibilidad con paneles internos).
- Enlaces públicos en frontend cambiados a `/animal/<uuid>` y `/product/<uuid>`:
  Animals, Home, Dashboard, Favorites, ShelterDetails, ShelterAnimals, Store,
  StoreProfile. Con fallback `uuid || id` por robustez.

## Rutas públicas auditadas que AÚN usan id numérico (fuera del alcance elegido)
| Ruta | Página | Entidad | Recomendación |
|------|--------|---------|---------------|
| `/shelter/:id` | ShelterDetails | Refugio | `refugios` ya tiene columna `slug` única; usar slug (o agregar uuid igual que mascotas/productos) |
| `/shelter/:id/animals` | ShelterAnimals | Refugio | Ídem anterior |
| `/shelter-store/:shelterId` | Store (tienda del refugio) | Refugio | Ídem anterior |
| `/store-profile/:storeId` | StoreProfile | Tienda | `tiendas` ya tiene columna `slug` única; usar slug (o agregar uuid) |
| `/donar/:refugioId` | DonacionPago | Refugio | Ídem refugios |

Las rutas de paneles autenticados (`/refugio/...`, `/tienda/...`, `/admin/...`,
`/mis-pedidos/:id`) usan id numérico pero no son públicas (requieren sesión), por
lo que **no** se modificaron.

## Nota
Las listas y favoritos de mascotas/productos que alimentan las tarjetas ahora
incluyen `uuid`, así que las URLs generadas usan UUID. Si algún origen de datos
todavía no trae `uuid`, los enlaces caen al `id` numérico (el backend lo acepta),
evitando enlaces rotos durante la transición.
