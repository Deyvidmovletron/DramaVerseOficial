from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.serie import StatusSerie
from app.schemas.categoria import CategoriaOut


class SerieBase(BaseModel):
    titulo: str = Field(min_length=1, max_length=200)
    sinopse: str | None = None
    categoria_id: int | None = None
    ano: int | None = None
    status: StatusSerie = StatusSerie.rascunho


class SerieCreate(SerieBase):
    pass


class SerieUpdate(SerieBase):
    pass


class SerieOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    titulo: str
    sinopse: str | None
    categoria: CategoriaOut | None
    capa_url: str | None
    banner_url: str | None
    ano: int | None
    status: StatusSerie
    criado_em: datetime
    total_episodios: int = 0


class SerieListOut(BaseModel):
    itens: list[SerieOut]
    total: int
    pagina: int
    total_paginas: int
