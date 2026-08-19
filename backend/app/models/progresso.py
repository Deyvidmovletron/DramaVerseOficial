from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Progresso(Base):
    __tablename__ = "progresso"
    __table_args__ = (UniqueConstraint("cliente_id", "episodio_id", name="uq_progresso_cliente_episodio"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    cliente_id: Mapped[int] = mapped_column(ForeignKey("clientes.id", ondelete="CASCADE"), index=True)
    episodio_id: Mapped[int] = mapped_column(ForeignKey("episodios.id", ondelete="CASCADE"), index=True)
    segundos_assistidos: Mapped[int] = mapped_column(Integer, default=0)
    concluido: Mapped[bool] = mapped_column(Boolean, default=False)
    atualizado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    cliente: Mapped["Cliente"] = relationship(back_populates="progresso")
    episodio: Mapped["Episodio"] = relationship(back_populates="progresso")
