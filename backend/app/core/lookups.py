"""Helpers para resolver valores de catalogo (codigo/nombre <-> id)."""
# pyrefly: ignore [missing-import]
from fastapi import HTTPException
# pyrefly: ignore [missing-import]
from sqlalchemy import func
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session


def id_por_codigo(db: Session, Model, valor, requerido: bool = False):
    """Resuelve el id de una fila de catalogo aceptando su codigo o su nombre
    (sin distinguir mayusculas). Ej: 'refugio', 'Perro', 'disponible'."""
    if valor is None or str(valor).strip() == "":
        if requerido:
            raise HTTPException(status_code=400, detail=f"Falta un valor de {Model.__tablename__}")
        return None
    v = str(valor).strip()
    obj = (
        db.query(Model)
        .filter(
            (Model.codigo == v)
            | (func.lower(Model.codigo) == v.lower())
            | (func.lower(Model.nombre) == v.lower())
        )
        .first()
    )
    if obj is None:
        if requerido:
            raise HTTPException(
                status_code=400,
                detail=f"Valor '{valor}' invalido para {Model.__tablename__}",
            )
        return None
    return obj.id
