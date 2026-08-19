from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.assinatura import StatusAssinatura
from app.models.cliente import StatusCliente


class ClienteAdminOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    email: str
    status: StatusCliente
    criado_em: datetime
    plano_atual_id: int | None
    plano_atual: str | None
    assinatura_status: str | None
    data_expiracao: datetime | None


class ClienteCreateIn(BaseModel):
    nome: str = Field(min_length=1, max_length=120)
    email: EmailStr
    senha: str = Field(min_length=6)
    plano_id: int | None = None


class ClienteUpdateIn(BaseModel):
    nome: str = Field(min_length=1, max_length=120)
    email: EmailStr
    status: StatusCliente


class AtribuirAssinaturaIn(BaseModel):
    plano_id: int


class AssinaturaAdminOut(BaseModel):
    id: int
    cliente_id: int
    cliente_nome: str
    cliente_email: str
    plano_id: int
    plano_nome: str
    status: StatusAssinatura
    data_inicio: datetime | None
    data_expiracao: datetime | None
    data_proximo_pagamento: datetime | None
    mp_subscription_id: str | None
    criado_em: datetime


class AssinaturaAdminUpdateIn(BaseModel):
    status: StatusAssinatura
    # Opcionais: a aba "Assinaturas" do modal de cliente manda só status+data_expiracao
    # (assinatura já é de um plano/cliente fixo); a página /admin/assinaturas manda tudo.
    plano_id: int | None = None
    data_inicio: datetime | None = None
    data_expiracao: datetime | None = None


class AssinaturaAdminCreateIn(BaseModel):
    cliente_id: int
    plano_id: int
    status: StatusAssinatura = StatusAssinatura.ativa
    # None + status "ativa" => calculados automaticamente (agora / agora + duração do plano).
    data_inicio: datetime | None = None
    data_expiracao: datetime | None = None


class AssinaturaAdminListOut(BaseModel):
    itens: list[AssinaturaAdminOut]
    total: int
    pagina: int
    total_paginas: int


class ClienteListOut(BaseModel):
    itens: list[ClienteAdminOut]
    total: int
    pagina: int
    total_paginas: int
