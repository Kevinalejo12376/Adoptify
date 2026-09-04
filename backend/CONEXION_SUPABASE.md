# Conexión a Supabase (pooler)

## ⚠️ Recomendación principal: usa el pooler TRANSACCIONAL (puerto 6543)

El `DATABASE_URL` de [`backend/.env`](.env) debe apuntar al pooler **transaccional**
(puerto **6543**), no al de **modo sesión** (puerto 5432):

```
postgresql://postgres.<ref>:<password>@aws-1-us-west-2.pooler.supabase.com:6543/postgres?sslmode=require
```

En modo sesión (5432), **cada conexión inactiva del pool de SQLAlchemy ocupa de
forma permanente uno de los 15 slots** del pooler. Al sumarse los servicios
internos de Supabase (PostgREST, pg_cron, pg_net, etc.) o varias instancias del
backend (local + Vercel al mismo tiempo), el cupo se agota y aparece:

```
psycopg2.OperationalError) FATAL: (EMAXCONNSESSION) max clients reached in
session mode - max clients are limited to pool_size: 15
INFO: ... "GET /api/refugios/ HTTP/1.1" 503 Service Unavailable
```

En modo transaccional (6543) las conexiones se liberan al terminar cada
transacción, por lo que el pool inactivo **ya no consume slots** y el error
desaparece. Detalles del pool en [`app/db/database.py`](app/db/database.py).

---

## Diagnóstico: conexión a Supabase (pooler) — "could not translate host name"

## Síntoma

Al ejecutar `uvicorn` en el backend aparece:

```
[lifespan] Advertencia: no se pudieron crear/sembrar tablas:
(psycopg2.OperationalError) could not translate host name
"aws-1-us-west-2.pooler.supabase.com" to address: Name or service not known
```

Y al hacer login:

```
sqlalchemy.exc.OperationalError: (psycopg2.OperationalError) could not translate
host name "aws-1-us-west-2.pooler.supabase.com" to address: Name or service not known
```

## Causa raíz

**El hostname de Supabase sí existe y resuelve correctamente.** No es un error de
la URL del [`backend/.env`](.env) ni del código. El problema es la **resolución DNS
de tu máquina**:

1. Tu equipo usa un servidor DNS interno (`10.18.174.144`, típico de una **VPN o red
   corporativa**).
2. Ese servidor DNS es **lento / inestable** y a veces no resuelve dominios externos
   de AWS. `psycopg2` intenta resolver `aws-1-us-west-2.pooler.supabase.com`, el DNS
   no responde a tiempo y se lanza "Name or service not known".
3. Además, la conexión TCP al puerto `5432` de AWS dio `timeout expired` en pruebas,
   lo que sugiere que la VPN/firewall puede estar **bloqueando o filtrando** la salida
   hacia AWS.

### Evidencia recogida

| Prueba | Resultado |
|--------|-----------|
| `nslookup aws-1-us-west-2.pooler.supabase.com` | Resuelve a `pool-tcp-usw21-...elb.us-west-2.amazonaws.com` (44.225.139.66, 34.215.156.231, 44.252.246.120) pero con `DNS request timed out` antes |
| `nslookup ... 8.8.8.8` (DNS público) | Igual: tarda y muestra timeout, pero resuelve |
| Conexión con `db.<ref>.supabase.co` (directa) | Mismo error de DNS |
| Conexión por IP `44.225.139.66:5432` | `timeout expired` (la red no alcanza el puerto) |

**Conclusión:** el código y la URL son correctos. Es un problema del entorno de red.

## Soluciones (de mayor a menor recomendación)

### 1. Desconectar la VPN / cambiar de red
Si estás conectado a una VPN o red corporativa, desconéctala y prueba con tu red
doméstica o el hotspot del celular. Con una red normal el DNS público suele resolver
sin problema.

### 2. Cambiar el DNS de la máquina a uno público
Usa DNS públicos fiables (Google `8.8.8.8` / `8.8.4.4` o Cloudflare `1.1.1.1`):

1. `Panel de control` → `Redes e Internet` → `Centro de redes y recursos compartidos`.
2. `Cambiar configuración del adaptador` → clic derecho en tu adaptador → `Propiedades`.
3. Selecciona `Protocolo de Internet versión 4 (TCP/IPv4)` → `Propiedades`.
4. Marca "Usar las siguientes direcciones de servidor DNS" y escribe:
   - Preferido: `8.8.8.8`
   - Alternativo: `1.1.1.1`
5. Acepta y ejecuta `ipconfig /flushdns` en una terminal.

> Requiere permisos de administrador. Si la red la controla tu empresa/VPN, pide al
> administrador que permita la salida a Supabase (puerto 5432) o usa la opción 3.

### 3. (Temporal) Mapear el hostname en el archivo `hosts`
Puedes forzar la resolución agregando las IPs conocidas del pooler a
`C:\Windows\System32\drivers\etc\hosts`:

```
44.225.139.66    aws-1-us-west-2.pooler.supabase.com
34.215.156.231   aws-1-us-west-2.pooler.supabase.com
44.252.246.120   aws-1-us-west-2.pooler.supabase.com
```

> ⚠️ **Temporal:** esas IPs pertenecen a un balanceador (ELB) de AWS y **pueden
> cambiar**. Si deja de funcionar, vuelve a consultar las IPs con
> `nslookup aws-1-us-west-2.pooler.supabase.com` y actualiza el archivo.
> Abre el archivo como administrador para editarlo.

### 4. Verificar el firewall de Windows
Si el puerto `5432` de salida está bloqueado, agrega una regla de salida:

```
netsh advfirewall firewall add rule name="Supabase 5432" dir=out action=allow protocol=TCP remoteport=5432
```

(Ejecutar en una terminal **como administrador**).

## Cómo comprobar que la conexión quedó bien

Desde `backend/`:

```powershell
.\venv\Scripts\python -c "import psycopg2; conn=psycopg2.connect('postgresql://postgres.swwfcwtcjldqojfeuljg:Adopt1f1_Pr0ject@aws-1-us-west-2.pooler.supabase.com:5432/postgres?sslmode=require', connect_timeout=15); cur=conn.cursor(); cur.execute('SELECT 1'); print('CONEXION OK ->', cur.fetchone()); conn.close()"
```

Si imprime `CONEXION OK -> (1,)`, la red quedó lista y `uvicorn` arrancará sin errores.

## Cambios aplicados al código (robustez)

Para que los fallos de BD no generen stack traces gigantes y la API responda de forma
limpia cuando la base de datos no esté disponible:

- [`backend/app/main.py`](app/main.py): se agregó un **manejador global** de errores de
  SQLAlchemy (`OperationalError`, `DBAPIError`, etc.) que devuelve `HTTP 503` con un
  JSON claro en lugar de un stack trace. También se mejoraron los mensajes de arranque
  del `lifespan` con un aviso concreto sobre DNS/VPN.
- [`backend/app/db/database.py`](app/db/database.py): se agregó `pool_timeout=10` para
  que las consultas no se cuelguen esperando una conexión del pool, y se documentó que
  `connect_timeout` no cubre la fase de resolución DNS.
