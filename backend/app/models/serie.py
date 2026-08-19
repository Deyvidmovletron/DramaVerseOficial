import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class StatusSerie(str, enum.Enum):
    rascunho = "rascunho"
    publicado = "publicado"


class Serie(Base):
    __tablename__ = "series"

    id: Mapped[int] = mapped_column(primary_key=True)
    titulo: Mapped[str] = mapped_column(String(200), index=True)
    sinopse: Mapped[str | None] = mapped_column(Text, nullable=True)
    categoria_id: Mapped[int | None] = mapped_column(ForeignKey("categorias.id"), nullable=True)
    capa_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    banner_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    ano: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[StatusSerie] = mapped_column(Enum(StatusSerie), default=StatusSerie.rascunho, index=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    categoria: Mapped["Categoria | None"] = relationship(back_populates="series")
    temporadas: Mapped[list["Temporada"]] = relationship(
        back_populates="serie", cascade="all, delete-orphan", order_by="Temporada.numero"
    )
    episodios: Mapped[list["Episodio"]] = relationship(
        back_populates="serie", cascade="all, delete-orphan", order_by="Episodio.ordem"
    )
    importacoes: Mapped[list["ImportacaoPlaylist"]] = relationship(back_populates="serie", cascade="all, delete-orphan")
    favoritos: Mapped[list["MinhaLista"]] = relationship(back_populates="serie", cascade="all, delete-orphan")
