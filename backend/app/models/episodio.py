import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class FonteEpisodio(str, enum.Enum):
    youtube_embed = "youtube_embed"
    youtube_baixado = "youtube_baixado"
    local = "local"
    panda = "panda"


class StatusProcessamento(str, enum.Enum):
    pronto = "pronto"
    pendente = "pendente"
    baixando = "baixando"
    erro = "erro"


class Episodio(Base):
    __tablename__ = "episodios"

    id: Mapped[int] = mapped_column(primary_key=True)
    serie_id: Mapped[int] = mapped_column(ForeignKey("series.id", ondelete="CASCADE"), index=True)
    temporada_id: Mapped[int | None] = mapped_column(ForeignKey("temporadas.id", ondelete="SET NULL"), nullable=True)
    numero: Mapped[int | None] = mapped_column(Integer, nullable=True)
    titulo: Mapped[str] = mapped_column(String(200))
    descricao: Mapped[str | None] = mapped_column(Text, nullable=True)
    thumbnail_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    duracao_segundos: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ordem: Mapped[int] = mapped_column(Integer, default=0, index=True)
    fonte: Mapped[FonteEpisodio] = mapped_column(Enum(FonteEpisodio))
    youtube_video_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    arquivo_local_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status_processamento: Mapped[StatusProcessamento] = mapped_column(
        Enum(StatusProcessamento), default=StatusProcessamento.pronto, index=True
    )
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    serie: Mapped["Serie"] = relationship(back_populates="episodios")
    temporada: Mapped["Temporada | None"] = relationship(back_populates="episodios")
    progresso: Mapped[list["Progresso"]] = relationship(back_populates="episodio", cascade="all, delete-orphan")
