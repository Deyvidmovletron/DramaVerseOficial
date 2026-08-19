from pydantic import BaseModel

from app.models.episodio import FonteEpisodio


class SerieCardOut(BaseModel):
    id: int
    titulo: str
    sinopse: str | None
    capa_url: str | None
    banner_url: str | None
    ano: int | None


class CarrosselOut(BaseModel):
    categoria: str
    categoria_id: int | None
    series: list[SerieCardOut]


class ContinuarAssistindoOut(BaseModel):
    episodio_id: int
    serie_id: int
    serie_titulo: str
    episodio_titulo: str
    thumbnail_url: str | None
    duracao_segundos: int | None
    segundos_assistidos: int


class HomeOut(BaseModel):
    destaques: list[SerieCardOut]
    continuar_assistindo: list[ContinuarAssistindoOut]
    carrosseis: list[CarrosselOut]


class EpisodioCatalogoOut(BaseModel):
    id: int
    numero: int | None
    titulo: str
    descricao: str | None
    thumbnail_url: str | None
    duracao_segundos: int | None
    ordem: int
    fonte: FonteEpisodio
    youtube_video_id: str | None


class SerieDetalheOut(BaseModel):
    id: int
    titulo: str
    sinopse: str | None
    capa_url: str | None
    banner_url: str | None
    ano: int | None
    categoria: str | None
    na_minha_lista: bool
    episodios: list[EpisodioCatalogoOut]


class ProximoEpisodioOut(BaseModel):
    id: int
    numero: int | None
    titulo: str
    thumbnail_url: str | None


class EpisodioPlayerOut(EpisodioCatalogoOut):
    serie_id: int
    serie_titulo: str
    segundos_assistidos: int
    concluido: bool
    proximo_episodio: ProximoEpisodioOut | None


class ProgressoIn(BaseModel):
    episodio_id: int
    segundos_assistidos: int
    concluido: bool = False
