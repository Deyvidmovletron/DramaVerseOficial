import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class StatusAssinatura(str, enum.Enum):
    pendente = "pendente"
    ativa = "ativa"
    atrasada = "atrasada"
    cancelada = "cancelada"


class Assinatura(Base):
    __tablename__ = "assinaturas"

    id: Mapped[int] = mapped_column(primary_key=True)
    # unique, não só index: cada cliente tem no máximo uma assinatura — "atribuir
    # plano"/checkout sempre atualiza a existente em vez de criar outra (ver
    # assinatura_service.py). Sem essa constraint, uma corrida ou um bug de código
    # duplica silenciosamente, que foi exatamente o que aconteceu antes desta revisão.
    cliente_id: Mapped[int] = mapped_column(ForeignKey("clientes.id", ondelete="CASCADE"), unique=True)
    plano_id: Mapped[int] = mapped_column(ForeignKey("planos.id"))
    status: Mapped[StatusAssinatura] = mapped_column(Enum(StatusAssinatura), default=StatusAssinatura.pendente, index=True)
    mp_subscription_id: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    data_inicio: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    data_expiracao: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, index=True)
    data_proximo_pagamento: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    cliente: Mapped["Cliente"] = relationship(back_populates="assinatura")
    plano: Mapped["Plano"] = relationship(back_populates="assinaturas")
    pagamentos: Mapped[list["Pagamento"]] = relationship(back_populates="assinatura", cascade="all, delete-orphan")
