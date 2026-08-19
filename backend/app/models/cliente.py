import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class StatusCliente(str, enum.Enum):
    ativo = "ativo"
    bloqueado = "bloqueado"


class Cliente(Base):
    __tablename__ = "clientes"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    senha_hash: Mapped[str] = mapped_column(String(255))
    status: Mapped[StatusCliente] = mapped_column(Enum(StatusCliente), default=StatusCliente.ativo, index=True)
    # Incrementado a cada logout/redefinição de senha/bloqueio para invalidar de uma vez
    # todos os tokens (access/refresh) emitidos antes disso — ver app/core/security.py.
    token_version: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    # Um cliente tem no máximo uma assinatura (constraint única em Assinatura.cliente_id).
    assinatura: Mapped["Assinatura | None"] = relationship(
        back_populates="cliente", cascade="all, delete-orphan", uselist=False
    )
    progresso: Mapped[list["Progresso"]] = relationship(back_populates="cliente", cascade="all, delete-orphan")
    minha_lista: Mapped[list["MinhaLista"]] = relationship(back_populates="cliente", cascade="all, delete-orphan")
