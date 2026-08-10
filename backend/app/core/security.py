# pyrefly: ignore [missing-import]
from datetime import datetime, timedelta, timezone
# pyrefly: ignore [missing-import]
from typing import Optional
# pyrefly: ignore [missing-import]
import bcrypt
# pyrefly: ignore [missing-import]
from jose import JWTError, jwt
# pyrefly: ignore [missing-import]
from fastapi import Depends, HTTPException, status
# pyrefly: ignore [missing-import]
from fastapi.security import OAuth2PasswordBearer
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
from app.core.config import settings
from app.db.database import get_db
from app.models.usuario import Usuario

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")
# Esquema opcional: no lanza error 401 si no hay token (usado en rutas públicas).
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)

# bcrypt tiene un limite de 72 bytes en la contrasena.
BCRYPT_MAX_BYTES = 72


def _prepare_password(password: str) -> bytes:
    """Codifica la contrasena a bytes y la trunca a 72 bytes (limite de bcrypt)."""
    return password.encode("utf-8")[:BCRYPT_MAX_BYTES]


def get_password_hash(password: str) -> str:
    """Genera un hash bcrypt seguro y lo devuelve como texto para almacenar."""
    hashed = bcrypt.hashpw(_prepare_password(password), bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica una contrasena en texto plano contra su hash almacenado."""
    try:
        return bcrypt.checkpw(
            _prepare_password(plain_password),
            hashed_password.encode("utf-8"),
        )
    except ValueError:
        # Hash con formato invalido almacenado en la BD.
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Usuario:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: Optional[str] = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(Usuario).filter(Usuario.email == email).first()
    if user is None:
        raise credentials_exception
    return user


def get_current_user_optional(token: Optional[str] = Depends(oauth2_scheme_optional), db: Session = Depends(get_db)) -> Optional[Usuario]:
    """Devuelve el usuario autenticado o None si no hay token válido.

    Pensado para rutas públicas que enriquecen su respuesta cuando el
    usuario está autenticado (p. ej. 'mi_reaccion' en publicaciones del foro).
    Un token inválido NO lanza error: se trata como usuario anónimo.
    """
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: Optional[str] = payload.get("sub")
        if email is None:
            return None
    except JWTError:
        return None
    return db.query(Usuario).filter(Usuario.email == email).first()


def get_current_refugio(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Usuario:
    """Exige que el usuario autenticado sea representante (rol 'refugio')
    o empleado activo de un refugio (rol 'empleado_refugio').
    """
    from app.models.refugio import RefugioEmpleado

    if current_user.rol_codigo == "refugio":
        return current_user
    if current_user.rol_codigo == "empleado_refugio":
        # Debe existir un vínculo activo con algún refugio.
        vinculo = (
            db.query(RefugioEmpleado)
            .filter(
                RefugioEmpleado.usuario_id == current_user.id,
                RefugioEmpleado.activo == True,
            )
            .first()
        )
        if vinculo is not None:
            return current_user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes un refugio asignado",
        )
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Requiere una cuenta de tipo refugio",
    )


def get_refugio_de_usuario(db: Session, user: Usuario):
    """Refugio asociado al usuario (representante o empleado activo)."""
    from app.models.refugio import Refugio, RefugioEmpleado

    if user.rol_codigo == "refugio":
        return db.query(Refugio).filter(Refugio.usuario_id == user.id).first()
    vinculo = (
        db.query(RefugioEmpleado)
        .filter(
            RefugioEmpleado.usuario_id == user.id,
            RefugioEmpleado.activo == True,
        )
        .first()
    )
    return vinculo.refugio if vinculo else None


def get_permisos_empleado_refugio(db: Session, user: Usuario) -> list:
    """Códigos de permisos del usuario en su refugio.

    - Representante (rol 'refugio'): tiene todos los permisos activos.
    - Empleado (rol 'empleado_refugio'): los permisos que le asignó el
      representante (tabla refugio_empleado_permisos).
    - Cualquier otro rol: lista vacía.
    """
    from app.models.refugio import RefugioPermiso, RefugioEmpleado

    if user.rol_codigo == "refugio":
        return [
            p.codigo
            for p in db.query(RefugioPermiso)
            .filter(RefugioPermiso.activo == True)
            .all()
        ]
    if user.rol_codigo == "empleado_refugio":
        vinculo = (
            db.query(RefugioEmpleado)
            .filter(
                RefugioEmpleado.usuario_id == user.id,
                RefugioEmpleado.activo == True,
            )
            .first()
        )
        if not vinculo:
            return []
        return [p.permiso.codigo for p in vinculo.permisos]
    return []


def require_permiso_refugio(codigo_permiso: str):
    """Dependencia: exige que el usuario autenticado pertenezca a un refugio
    y tenga el permiso indicado (el representante siempre lo tiene).

    Uso:
        @router.get("/...")
        def x(current_user: Usuario = Depends(require_permiso_refugio("mascotas")), ...):
    """
    def _depender(current_user: Usuario = Depends(get_current_refugio), db: Session = Depends(get_db)):
        permisos = get_permisos_empleado_refugio(db, current_user)
        if codigo_permiso not in permisos:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"No tienes permiso para realizar esta acción ({codigo_permiso})",
            )
        return current_user
    return _depender


def get_current_admin(current_user: Usuario = Depends(get_current_user)) -> Usuario:
    """Exige que el usuario autenticado sea administrador."""
    if current_user.rol_codigo not in ("administrador", "administrador_principal"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requiere una cuenta de administrador",
        )
    return current_user


def get_current_tienda(current_user: Usuario = Depends(get_current_user)) -> Usuario:
    """Exige que el usuario autenticado sea una tienda aliada."""
    if current_user.rol_codigo != "tienda_aliada":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requiere una cuenta de tienda aliada",
        )
    return current_user
