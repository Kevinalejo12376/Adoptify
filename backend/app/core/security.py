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


def get_current_refugio(current_user: Usuario = Depends(get_current_user)) -> Usuario:
    """Exige que el usuario autenticado tenga rol 'refugio'."""
    if current_user.rol_codigo != "refugio":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requiere una cuenta de tipo refugio",
        )
    return current_user


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
