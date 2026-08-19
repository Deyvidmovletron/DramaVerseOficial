from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.cliente import StatusCliente


class ClienteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    email: str
    status: StatusCliente
    criado_em: datetime


class AssinaturaResumoOut(BaseModel):
    ativa: bool
    status: str | None = None
    data_expiracao: datetime | None = None


class ClienteMeOut(ClienteOut):
    assinatura: AssinaturaResumoOut
