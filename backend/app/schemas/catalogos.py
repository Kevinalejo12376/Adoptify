# pyrefly: ignore [missing-import]
from pydantic import BaseModel, ConfigDict
# pyrefly: ignore [missing-import]
from typing import Optional


class CatalogoItem(BaseModel):
    id: int
    codigo: str
    nombre: str
    icono: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
