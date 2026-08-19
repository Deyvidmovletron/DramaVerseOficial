from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.episodio import FonteEpisodio, StatusProcessamento


class EpisodioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    serie_id: int
    temporada_id: int | None
    numero: int | None
    titulo: str
    descricao: str | None
    thumbnail_url: str | None
    duracao_segundos: int | None
    ordem: int
    fonte: FonteEpisodio
    youtube_video_id: str | None
    status_processamento: StatusProcessamento
    criado_em: datetime


class EpisodioYoutubeIn(BaseModel):
    youtube_url: str = Field(min_length=5)
    numero: int | None = None
    temporada_id: int | None = None
    baixar: bool = False


class EpisodioUpdateIn(BaseModel):
    titulo: str = Field(min_length=1, max_length=200)
    descricao: str | None = None
    numero: int | None = None
    temporada_id: int | None = None


class ReordenarEpisodiosIn(BaseModel):
    ordem: list[int]
