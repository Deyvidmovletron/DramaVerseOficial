import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class StatusImportacao(str, enum.Enum):
    processando = "processando"
    concluida = "concluida"
    erro = "erro"


class ImportacaoPlaylist(Base):
    __tablename__ = "importacoes_playlist"

    id: Mapped[int] = mapped_column(primary_key=True)
    serie_id: Mapped[int] = mapped_column(ForeignKey("series.id", ondelete="CASCADE"), index=True)
    playlist_url: Mapped[str] = mapped_column(String(500))
    total_encontrados: Mapped[int] = mapped_column(Integer, default=0)
    total_importados: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[StatusImportacao] = mapped_column(Enum(StatusImportacao), default=StatusImportacao.processando, index=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    serie: Mapped["Serie"] = relationship(back_populates="importacoes")
