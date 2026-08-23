"""Disponibilidad de refugios y mascotas para el frontend público.

Un refugio se considera VISIBLE (activo) únicamente si:
- No está borrado lógicamente: ``refugios.activo == True``, y
- La cuenta de su representante está activa: ``usuarios.activo == True``.

Nota: el administrador "suspende" un refugio mediante
``cambiar_estado_refugio_admin`` desactivando la cuenta del representante
(``Usuario.activo = False``) y ``Refugio.verificado = False``, SIN tocar
``Refugio.activo``. Por eso la disponibilidad debe revisar ambas condiciones.

Si el refugio está inactivo/suspendido, ni el refugio ni sus mascotas
deben aparecer a los usuarios.
"""
# pyrefly: ignore [missing-import]
from sqlalchemy import and_, or_

# pyrefly: ignore [missing-import]
from app.models.refugio import Refugio
# pyrefly: ignore [missing-import]
from app.models.usuario import Usuario


def refugio_visible():
    """Condición para filtrar directamente la tabla ``Refugio``.

    Devuelve los refugios que sí deben mostrarse al público: no borrados y
    con cuenta de representante activa.
    """
    return and_(
        Refugio.activo == True,  # noqa: E712
        Refugio.usuario.has(Usuario.activo == True),  # noqa: E712
    )


def mascota_de_refugio_visible():
    """Condición para filtrar ``Mascota``: solo mascotas de refugios visibles.

    Las mascotas sin refugio (``refugio_id`` NULL) se conservan tal como
    funcionaban antes.
    """
    from app.models.mascota import Mascota
    return or_(
        Mascota.refugio_id.is_(None),
        and_(
            Mascota.refugio.has(Refugio.activo == True),  # noqa: E712
            Mascota.refugio.has(Refugio.usuario.has(Usuario.activo == True)),  # noqa: E712
        ),
    )
