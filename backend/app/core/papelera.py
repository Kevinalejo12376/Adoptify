"""Utilidades de "papelera" (borradores) para mascotas y productos.

En Adoptify el borrado no es instantáneo: al eliminar una mascota o un
producto (rol Refugio y Tienda) el registro pasa a una **papelera / borradores**
durante ``DIAS_PAPELERA`` (30 días). Desde allí el dueño puede RESTAURARLO o
ELIMINARLO DEFINITIVAMENTE. Transcurridos los 30 días el registro se purga solo
(ya no aparece en la papelera y no es restaurable).

Ciclo de vida de un registro (según las columnas ``activo`` / ``eliminado_en``):

- ``eliminado_en IS NULL``            -> VIVO: visible para el dueño; puede
  publicarse u ocultarse (``activo``). Las mascotas adoptadas se conservan con
  ``activo=False`` y ``eliminado_en`` nulo (no van a la papelera).
- ``eliminado_en`` dentro de los      -> EN PAPELERA (borrador): oculto del
  últimos 30 días                      público y del panel principal; restaurable.
- ``eliminado_en`` hace más de        -> PURGADO: fuera de la papelera para
  30 días                              siempre (archivado permanente e
                                       irreversible).

Por qué el borrado definitivo NO elimina la fila de forma física: las tablas
referencian a mascotas/productos con FK ``ON DELETE CASCADE`` (solicitudes de
adopción, kardex de inventario, reseñas, favoritos, imágenes). Un DELETE físico
destruiría ese historial. Por eso el borrado definitivo avanza ``eliminado_en``
más allá de la ventana de 30 días: el registro desaparece de toda vista y queda
archivado para siempre, conservando la integridad referencial y permitiendo
reutilizar nombres (las validaciones de duplicados ignoran los registros con
``eliminado_en`` no nulo).
"""
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

# Días que un elemento permanece restaurable en la papelera antes de purgarse.
DIAS_PAPELERA = 30

# Margen usado al "eliminar definitivamente": se envía la fecha a un punto fuera
# de la ventana (ahora - (DIAS+1)) para que el registro deje de estar en la
# papelera de forma irreversible.
_FUERA_DE_VENTANA = timedelta(days=DIAS_PAPELERA + 1)


def _ahora() -> datetime:
    return datetime.now(timezone.utc)


def corte_papelera() -> datetime:
    """Fecha límite (ahora - 30 días). Solo lo eliminado después de esta fecha
    sigue restaurable; lo anterior se considera purgado."""
    return _ahora() - timedelta(days=DIAS_PAPELERA)


def esta_en_papelera(obj) -> bool:
    """True si el objeto tiene eliminado_en definido (dentro o fuera de ventana)."""
    return bool(getattr(obj, "eliminado_en", None))


def mover_a_papelera(db: Session, obj) -> None:
    """Mueve un registro a la papelera (borradores): lo oculta y registra la
    fecha de eliminación. Hace commit."""
    if hasattr(obj, "activo"):
        obj.activo = False
    obj.eliminado_en = _ahora()
    db.add(obj)
    db.commit()


def restaurar(db: Session, obj) -> None:
    """Restaura un registro desde la papelera: lo vuelve visible y limpia la
    fecha de eliminación. Hace commit."""
    if hasattr(obj, "activo"):
        obj.activo = True
    obj.eliminado_en = None
    db.add(obj)
    db.commit()


def eliminar_definitivo(db: Session, obj) -> None:
    """Elimina definitivamente un registro de la papelera (archivado permanente).

    NOTA: no es un DELETE físico (ver docstring del módulo); mueve la fecha de
    eliminación fuera de la ventana de 30 días para que el registro desaparezca
    de la papelera y no pueda restaurarse, conservando el historial referencial.
    """
    if hasattr(obj, "activo"):
        obj.activo = False
    obj.eliminado_en = _ahora() - _FUERA_DE_VENTANA
    db.add(obj)
    db.commit()


def filtro_estado_papelera(modelo):
    """Expresión SQLAlchemy para seleccionar SOLO los registros en papelera que
    aún son restaurables (eliminados dentro de los últimos 30 días)."""
    from sqlalchemy import and_
    return and_(
        getattr(modelo, "eliminado_en").isnot(None),
        getattr(modelo, "eliminado_en") >= corte_papelera(),
    )
