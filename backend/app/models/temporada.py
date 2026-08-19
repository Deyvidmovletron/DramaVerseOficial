from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Temporada(Base):
    __tablename__ = "temporadas"
    __table_args__ = (UniqueConstraint("serie_id", "numero", name="uq_temporada_serie_numero"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    serie_id: Mapped[int] = mapped_column(ForeignKey("series.id", ondelete="CASCADE"), index=True)
    numero: Mapped[int] = mapped_column(Integer)
    titulo: Mapped[str | None] = mapped_column(String(120), nullable=True)

    serie: Mapped["Serie"] = relationship(back_populates="temporadas")
    episodios: Mapped[list["Episodio"]] = relationship(back_populates="temporada", order_by="Episodio.ordem")
