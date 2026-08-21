# Adoptify

Plataforma web para facilitar el proceso de adopción responsable de mascotas mediante la conexión entre refugios, tiendas y adoptantes.

El proyecto está dividido en tres componentes principales:

- **backend/** — API REST desarrollada con FastAPI.
- **frontend/** — Aplicación web desarrollada con React.
- **n8n/** — Plataforma de automatización para flujos de trabajo, notificaciones e integraciones.

---

## Tecnologías utilizadas

### Backend

- FastAPI
- SQLAlchemy
- Pydantic

### Frontend

- React
- Vite
- Tailwind CSS

### Base de datos

- PostgreSQL
- Supabase

### Automatización

- n8n

### Contenedores

- Docker
- Docker Compose

### Control de versiones

- Git
- GitHub
- Git Flow

```

## Estructura del proyecto

```
Adoptify-proyect/
├── backend/                          API REST desarrollada con FastAPI
│   ├── app/
│   │   ├── api/
│   │   │   └── routers/              Endpoints (auth, mascotas, refugios, solicitudes, productos, etc.)
│   │   ├── core/                     Configuración, seguridad y autenticación (JWT, hashing)
│   │   ├── db/                       Conexión y configuración de la base de datos
│   │   ├── models/                   Modelos de la base de datos (SQLAlchemy)
│   │   ├── schemas/                  Esquemas y validaciones (Pydantic)
│   │   └── main.py                   Punto de entrada de la aplicación
│   ├── requirements.txt              Dependencias del backend
│   ├── supabase_schema.sql           Script para crear la base de datos en Supabase
│   ├── .env                          Variables de entorno (NO se sube a Git)
│   └── .env.example                  Plantilla de variables de entorno
│
├── frontend/                         Aplicación web desarrollada con React + Vite + Tailwind CSS
│   ├── src/                          Páginas, componentes, contextos, hooks y cliente API
│   ├── package.json                  Dependencias y scripts del frontend
│   └── .env                          Variables de entorno del frontend
│
├── n8n/                              Automatizaciones e integraciones del proyecto
│   ├── docker-compose.yml            Configuración del contenedor Docker
│   ├── .env                          Variables de entorno locales (NO se sube a Git)
│   ├── .env.example                  Plantilla de variables de entorno
│   └── data/                         Datos locales de n8n (SQLite, credenciales, historial)
│
├── .gitignore                        Reglas para excluir archivos del control de versiones
└── README.md                         Documentación principal del proyecto
```

---

## Requisitos

- Python 3.11+ (probado con 3.14)
- Node.js 18+ (probado con 24) y npm
- Docker Desktop
- Git

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

## Automatizaciones (n8n)

El proyecto utiliza **n8n** para ejecutar automatizaciones, integraciones y flujos de trabajo entre los diferentes servicios.

### Requisitos

- Docker Desktop
- WSL2 (Windows)

### Instalación

Desde la carpeta `n8n/`:

```bash
copy .env.example .env
docker compose up -d
```
Nota: La primera vez Docker descargará automáticamente la imagen de n8n. Este proceso puede tardar algunos minutos dependiendo de la velocidad de Internet.

### Acceso

Abrir en el navegador:

```
http://localhost:5678
```

### Comandos útiles

```bash
docker compose up -d      # Iniciar n8n
docker compose down       # Detener n8n
docker compose restart    # Reiniciar n8n
docker ps                 # Ver contenedores activos
docker compose logs -f    # Ver los registros del contenedor en tiempo real.
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

## Arranque rapido (tres terminales)

```bash
# Terminal 1 - backend
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload

# Terminal 2 - frontend
cd frontend
npm run dev

# Terminal 3 - n8n
cd n8n
docker compose up -d
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

## Buenas prácticas para desarrolladores

- No subir archivos `.env` al repositorio.
- Crear una nueva rama para cada funcionalidad siguiendo Git Flow.
- Mantener actualizado este README cuando se agreguen nuevas funcionalidades.
- Ejecutar pruebas antes de realizar un Pull Request.
