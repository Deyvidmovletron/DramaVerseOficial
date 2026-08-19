import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class StatusPagamento(str, enum.Enum):
    pendente = "pendente"
    aprovado = "aprovado"
    rejeitado = "rejeitado"
    estornado = "estornado"


class Pagamento(Base):
    __tablename__ = "pagamentos"

    id: Mapped[int] = mapped_column(primary_key=True)
    assinatura_id: Mapped[int] = mapped_column(ForeignKey("assinaturas.id", ondelete="CASCADE"), index=True)
    # unique (não só index): a checagem de idempotência do webhook confere se já existe um
    # Pagamento com esse mp_payment_id antes de criar outro — sem a constraint no banco, dois
    # webhooks concorrentes (retry do Mercado Pago) podiam passar os dois pela checagem em
    # Python e duplicar o registro. NULL continua permitido múltiplas vezes (pagamentos sem
    # referência externa, se algum dia existirem).
    mp_payment_id: Mapped[str | None] = mapped_column(String(120), nullable=True, unique=True, index=True)
    valor_centavos: Mapped[int] = mapped_column(Integer)
    status: Mapped[StatusPagamento] = mapped_column(Enum(StatusPagamento), default=StatusPagamento.pendente, index=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    assinatura: Mapped["Assinatura"] = relationship(back_populates="pagamentos")
