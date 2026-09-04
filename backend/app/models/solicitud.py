# pyrefly: ignore [missing-import]
from sqlalchemy import Column, Integer, String, Text, Boolean, Date, DateTime, ForeignKey, func
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import relationship
from app.db.database import Base


class SolicitudAdopcion(Base):
    __tablename__ = "solicitudes_adopcion"

    id = Column(Integer, primary_key=True, index=True)
    mascota_id = Column(Integer, ForeignKey("mascotas.id", ondelete="CASCADE"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"))
    estado_id = Column(Integer, ForeignKey("estados_solicitud.id"), nullable=False)
    nombre_contacto = Column(String(150), nullable=False)
    email_contacto = Column(String(255))
    telefono_contacto = Column(String(30))
    ubicacion = Column(String(150))
    # Datos completos y actualizados del solicitante (se toman del perfil del
    # usuario en el momento de crear la solicitud) para que el refugio pueda
    # contactar y conocer al adoptante sin depender del formulario del modal.
    departamento = Column(String(150))
    municipio = Column(String(150))
    direccion = Column(String(200))
    tipo_documento = Column(String(30))
    numero_documento = Column(String(30))
    mensaje = Column(Text)
    notas = Column(Text)
    tiene_familia = Column(Boolean, nullable=False, default=False)
    tiene_experiencia = Column(Boolean, nullable=False, default=False)
    progreso = Column(Integer, nullable=False, default=0)
    fecha_seguimiento = Column(Date)
    fecha_completada = Column(Date)
    creada_en = Column(DateTime(timezone=True), server_default=func.now())

    mascota = relationship("Mascota", back_populates="solicitudes", lazy="joined")
    usuario = relationship("Usuario", back_populates="solicitudes")
    estado = relationship("EstadoSolicitud", lazy="joined")
