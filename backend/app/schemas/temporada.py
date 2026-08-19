from pydantic import BaseModel, ConfigDict, Field


class TemporadaBase(BaseModel):
    numero: int = Field(ge=1)
    titulo: str | None = None


class TemporadaCreate(TemporadaBase):
    pass


class TemporadaUpdate(TemporadaBase):
    pass


class TemporadaOut(TemporadaBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    serie_id: int
