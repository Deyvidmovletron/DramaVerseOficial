from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AdminOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    email: str
    criado_em: datetime
