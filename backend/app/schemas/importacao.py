from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.importacao_playlist import StatusImportacao


class PlaylistPreviewIn(BaseModel):
    playlist_url: str = Field(min_length=5)


class PlaylistVideoOut(BaseModel):
    video_id: str
    titulo: str
    thumbnail_url: str | None
    duracao_segundos: int | None
    ja_importado: bool = False


class PlaylistPreviewOut(BaseModel):
    playlist_url: str
    playlist_titulo: str | None = None
    playlist_thumbnail_url: str | None = None
    total_encontrados: int
    videos: list[PlaylistVideoOut]


class PlaylistImportarIn(BaseModel):
    playlist_url: str = Field(min_length=5)
    video_ids: list[str] | None = None  # None = importar todos os vídeos encontrados
    baixar: bool = False
    temporada_id: int | None = None


class ImportacaoPlaylistOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    serie_id: int
    playlist_url: str
    total_encontrados: int
    total_importados: int
    status: StatusImportacao
    criado_em: datetime
