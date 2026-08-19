from datetime import datetime

from pydantic import BaseModel


class CheckoutIn(BaseModel):
    plano_id: int


class CheckoutOut(BaseModel):
    checkout_url: str


class CheckoutCartaoIn(BaseModel):
    plano_id: int
    card_token_id: str
    payer_first_name: str | None = None
    payer_last_name: str | None = None
    cpf: str | None = None


class CheckoutCartaoOut(BaseModel):
    assinatura_id: int
    status: str  # "ativa" | "pendente" | "recusada"
    mensagem: str | None = None
    data_expiracao: datetime | None = None


class CheckoutPixIn(BaseModel):
    plano_id: int


class CheckoutPixOut(BaseModel):
    assinatura_id: int
    payment_id: str
    qr_code: str | None
    qr_code_base64: str | None


class VerificarPagamentoOut(BaseModel):
    status: str  # "aprovado" | "pendente"
    ativa: bool
    data_expiracao: datetime | None = None
