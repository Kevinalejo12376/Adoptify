"""Modelo de donaciones de personas (usuarios anónimos o registrados) a refugios.

Este modelo es DIFERENTE de ``Donacion``/``DonacionItem`` (módulo Tienda Aliada),
que modela donaciones de PRODUCTOS realizadas por tiendas aliadas. Aquí se
cubren las donaciones directas de cualquier persona:

  - Donaciones monetarias (``tipo = "dinero"``) con flujo hacia una pasarela de
    pagos. La pasarela todavía NO está integrada; el endpoint de confirmación
    ``POST /api/donaciones/{id}/pago-confirmado`` queda preparado como punto de
    integración para el webhook futuro.
  - Donaciones físicas (``tipo = "fisica"``): ropa, accesorios, alimentos, etc.,
    que se coordinan por teléfono/correo y el refugio confirma al recibir.

Estados (``estado``):
  - pendiente:       donación creada; dinero esperando el pago / física
                     esperando envío o confirmación.
  - pago_confirmado: donación monetaria cuyo pago fue confirmado (pasarela).
  - recibida:        el refugio confirmó la recepción (física o dinero).
  - no_recibida:     el refugio reportó que NO la recibió (con ``motivo``).
  - fallida:         donación monetaria cuyo pago fue rechazado/cancelado.

Trazabilidad: se guardan snapshots legibles (``nombre_donante``,
``refugio_nombre``), una ``referencia`` única (para que una donación anónima
pueda consultarse), el ``transaccion_id``/``pasarela_datos`` de la pasarela y
quién confirmó la recepción (``confirmado_por_nombre``).
"""
# pyrefly: ignore [missing-import]
from sqlalchemy import Column, Integer, String, Text, Boolean, BigInteger, DateTime, ForeignKey, func
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import relationship
from app.db.database import Base


class DonacionUsuario(Base):
    __tablename__ = "donaciones_usuarios"

    id = Column(Integer, primary_key=True, index=True)
    # Donante: null => donación anónima (sin cuenta).
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), index=True)
    refugio_id = Column(Integer, ForeignKey("refugios.id", ondelete="SET NULL"), nullable=False, index=True)
    # Tipo de donación: 'dinero' | 'fisica'
    tipo = Column(String(20), nullable=False)
    # Valor monetario en COP (entero, sin centavos) — solo para 'dinero'.
    valor = Column(BigInteger)
    # Detalle de la donación física (qué se dona) u observación del donante.
    detalle = Column(Text)
    # Estado del ciclo de vida (ver docstring).
    estado = Column(String(30), nullable=False, default="pendiente", index=True)

    # --- Identidad del donante (snapshots para trazabilidad) ---
    es_anonimo = Column(Boolean, nullable=False, default=True)
    nombre_donante = Column(String(200), default="Donación anónima")
    email_contacto = Column(String(255))
    telefono_contacto = Column(String(30))

    # Refugio beneficiado (snapshot legible aunque cambie su nombre).
    refugio_nombre = Column(String(150))

    # --- Referencia única (permite consultar una donación anónima) ---
    referencia = Column(String(30), unique=True, index=True)

    # --- Pasarela de pagos (integración futura) ---
    transaccion_id = Column(String(200))
    pasarela_datos = Column(Text)  # JSON con respuesta del proveedor de pago

    # --- Gestión de recepción por el refugio ---
    motivo_no_recibida = Column(Text)
    confirmado_por_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"))
    confirmado_por_nombre = Column(String(200))
    confirmado_en = Column(DateTime(timezone=True))

    # --- Publicación en el foro (donación compartida) ---
    post_foro_id = Column(Integer, ForeignKey("foro_posts.id", ondelete="SET NULL"))

    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), onupdate=func.now())

    usuario = relationship("Usuario", foreign_keys=[usuario_id])
    refugio = relationship("Refugio")
    confirmado_por = relationship("Usuario", foreign_keys=[confirmado_por_id])
