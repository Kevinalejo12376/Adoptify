# pyrefly: ignore [missing-import]
from sqlalchemy import Column, Integer, String, DateTime, Boolean, func
from app.db.database import Base


class CodigoVerificacion(Base):
    """Almacena códigos de verificación de 6 dígitos para registro y recuperación de contraseña."""
    __tablename__ = "codigos_verificacion"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), nullable=False, index=True)
    codigo = Column(String(6), nullable=False)
    tipo = Column(String(20), nullable=False)  # 'registro' | 'reset_password'
    usado = Column(Boolean, nullable=False, default=False)
    expira_en = Column(DateTime(timezone=True), nullable=False)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
