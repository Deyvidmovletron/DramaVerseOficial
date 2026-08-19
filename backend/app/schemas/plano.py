from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PlanoBase(BaseModel):
    nome: str = Field(min_length=1, max_length=80)
    descricao: str | None = None
    preco_centavos: int = Field(ge=0)
    duracao_dias: int = Field(ge=1, default=30)
    ativo: bool = True


class PlanoCreate(PlanoBase):
    pass


class PlanoUpdate(PlanoBase):
    pass


class PlanoOut(PlanoBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    criado_em: datetime
