from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Plano(Base):
    __tablename__ = "planos"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(80))
    descricao: Mapped[str | None] = mapped_column(Text, nullable=True)
    preco_centavos: Mapped[int] = mapped_column(Integer)
    duracao_dias: Mapped[int] = mapped_column(Integer, default=30)
    # Período de teste grátis em dias inteiros (0 = sem teste). Ao assinar com teste, o
    # cartão é cadastrado no Mercado Pago mas a 1ª cobrança só ocorre ao fim do teste.
    periodo_teste_dias: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    # Marca o plano "recomendado" — usado pelos layouts de 2/3 planos na tela de registro.
    destaque: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0")
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    mp_plan_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    assinaturas: Mapped[list["Assinatura"]] = relationship(back_populates="plano")
