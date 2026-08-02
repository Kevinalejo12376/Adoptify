# Adoptify

Plataforma para facilitar la adopcion de mascotas.con dos partes:

- **`backend/`** — API REST con FastAPI + SQLAlchemy (PostgreSQL/Supabase o SQLite en local).
- **`frontend/`** — Aplicación React (Vite) + Tailwind CSS.

---

## Estructura del proyecto

```
Adoptify-proyect/
├── backend/                  API FastAPI
│   ├── app/
│   │   ├── main.py           Punto de entrada (crea la app + rutas)
│   │   ├── api/routers/      Endpoints (auth, mascotas, refugios, solicitudes, productos)
│   │   ├── core/             Configuracion y seguridad (JWT, hashing)
│   │   ├── db/               Conexion a la base de datos
│   │   ├── models/           Tablas (SQLAlchemy)
│   │   └── schemas/          Validacion (Pydantic)
│   ├── requirements.txt      Dependencias del backend
│   ├── supabase_schema.sql   Script SQL para crear la BD en Supabase
│   ├── .env                  Variables reales (NO se sube a git)
│   └── .env.example          Plantilla de variables
├── frontend/                 App React (Vite + Tailwind)
│   ├── src/                  Paginas, componentes, contexts y cliente API (src/api)
│   ├── package.json
│   └── .env                  URL del backend (VITE_API_URL)
├── .gitignore                Unico, cubre backend y frontend
└── README.md
```

---

## Requisitos

- Python 3.11+ (probado con 3.14)
- Node.js 18+ (probado con 24) y npm

---

## Backend (FastAPI)

Desde la carpeta `backend/`:

```bash
# 1. Crear el entorno virtual (si no existe) e instalar dependencias
python -m venv venv
venv\Scripts\activate            # Windows
# source venv/bin/activate       # Linux/Mac
pip install -r requirements.txt

# 2. Configurar variables: copia .env.example a .env y ajusta valores
copy .env.example .env           # Windows

# 3. Arrancar el servidor
uvicorn app.main:app --reload
```

- API: `http://127.0.0.1:8000`
- Documentacion interactiva (Swagger): `http://127.0.0.1:8000/docs`

### Variables de entorno del backend (`backend/.env`)

```
DATABASE_URL="sqlite:///./adoptify.db"        # local; o la URL de Supabase (Postgres)
SECRET_KEY="<clave-secreta-generada>"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES="30"
CORS_ORIGINS='["http://localhost:5173", "http://localhost:3000"]'
```

---

## Frontend (React + Vite)

Desde la carpeta `frontend/`:

```bash
npm install
npm run dev        # http://localhost:5173
```

### Variable de entorno del frontend (`frontend/.env`)

```
VITE_API_URL=http://127.0.0.1:8000
```

---

## Base de datos con Supabase

1. En Supabase: **SQL Editor → New query**.
2. Pega el contenido de `backend/supabase_schema.sql` y ejecuta (**Run**).
   - Crea las 29 tablas y activa Row Level Security.
3. Copia la cadena de conexion: **Project Settings → Database → Connection string → URI**.
4. Pégala en `backend/.env` como `DATABASE_URL` (reemplaza la contraseña real).

> El backend se conecta con el rol `postgres` (omite RLS). El frontend nunca
> habla directo con Supabase: siempre pasa por la API de FastAPI.

---

## Arranque rapido (dos terminales)

```bash
# Terminal 1 - backend
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload

# Terminal 2 - frontend
cd frontend
npm run dev
```

---

## Despliegue (producción)

La estructura monorepo (`backend/` + `frontend/`) es apta para desplegar cada
parte por separado.

### Backend (FastAPI)
Plataformas recomendadas: **Render**, **Railway** o **Fly.io** (soportan Docker).

1. Sube el repo a GitHub.
2. Crea un servicio nuevo apuntando a la carpeta `backend/` (incluye un `Dockerfile`).
3. Configura las variables de entorno en el panel de la plataforma (NO subas `.env`):
   - `DATABASE_URL` (tu cadena de Supabase)
   - `SECRET_KEY`
   - `ALGORITHM=HS256`
   - `ACCESS_TOKEN_EXPIRE_MINUTES=30`
   - `CORS_ORIGINS=["https://TU-FRONTEND.vercel.app"]`  (la URL real del frontend)
4. La plataforma inyecta `PORT`; el `Dockerfile` ya arranca con
   `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.

### Frontend (React + Vite)
Plataformas recomendadas: **Vercel** o **Netlify**.

1. Crea un proyecto apuntando a la carpeta `frontend/`.
2. Build command: `npm run build` — Output dir: `dist`.
3. Variable de entorno: `VITE_API_URL=https://TU-BACKEND.onrender.com` (URL real del backend).

### Orden de despliegue
1. Despliega el backend y copia su URL pública.
2. Pon esa URL en `VITE_API_URL` del frontend y despliega el frontend.
3. Pon la URL del frontend en `CORS_ORIGINS` del backend y redepliega el backend.
