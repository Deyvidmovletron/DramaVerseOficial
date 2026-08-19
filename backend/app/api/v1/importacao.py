from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_admin, get_db
from app.models.admin import Admin
from app.models.episodio import Episodio, FonteEpisodio, StatusProcessamento
from app.models.importacao_playlist import ImportacaoPlaylist, StatusImportacao
from app.models.serie import Serie
from app.schemas.importacao import (
    ImportacaoPlaylistOut,
    PlaylistImportarIn,
    PlaylistPreviewIn,
    PlaylistPreviewOut,
    PlaylistVideoOut,
)
from app.services.download_manager import executar_download
from app.services.media_storage import download_youtube_thumbnail
from app.services.serie_capa import preencher_capa_padrao
from app.services.youtube_service import YoutubeError, fetch_playlist_info

router = APIRouter(tags=["importacao"])


def _get_serie_or_404(db: Session, serie_id: int) -> Serie:
    serie = db.query(Serie).options(selectinload(Serie.episodios)).filter(Serie.id == serie_id).first()
    if serie is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Série não encontrada")
    return serie


def _proxima_ordem(db: Session, serie_id: int) -> int:
    ultimo = (
        db.query(Episodio.ordem).filter(Episodio.serie_id == serie_id).order_by(Episodio.ordem.desc()).first()
    )
    return (ultimo[0] + 1) if ultimo else 1


@router.post("/series/{serie_id}/playlist/preview", response_model=PlaylistPreviewOut)
def preview_playlist(
    serie_id: int,
    data: PlaylistPreviewIn,
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
) -> PlaylistPreviewOut:
    serie = _get_serie_or_404(db, serie_id)

    try:
        playlist = fetch_playlist_info(data.playlist_url)
    except YoutubeError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    ja_importados = {e.youtube_video_id for e in serie.episodios if e.youtube_video_id}

    videos = [
        PlaylistVideoOut(
            video_id=entrada["video_id"],
            titulo=entrada["titulo"],
            thumbnail_url=entrada["thumbnail_url"],
            duracao_segundos=entrada["duracao_segundos"],
            ja_importado=entrada["video_id"] in ja_importados,
        )
        for entrada in playlist["entradas"]
    ]

    return PlaylistPreviewOut(
        playlist_url=data.playlist_url,
        playlist_titulo=playlist["titulo"],
        playlist_thumbnail_url=playlist["thumbnail_url"],
        total_encontrados=len(videos),
        videos=videos,
    )


@router.post("/series/{serie_id}/playlist/importar", response_model=ImportacaoPlaylistOut, status_code=status.HTTP_201_CREATED)
def importar_playlist(
    serie_id: int,
    data: PlaylistImportarIn,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
) -> ImportacaoPlaylist:
    serie = _get_serie_or_404(db, serie_id)

    try:
        playlist = fetch_playlist_info(data.playlist_url)
    except YoutubeError as exc:
        log = ImportacaoPlaylist(
            serie_id=serie_id,
            playlist_url=data.playlist_url,
            total_encontrados=0,
            total_importados=0,
            status=StatusImportacao.erro,
        )
        db.add(log)
        db.commit()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    entradas = playlist["entradas"]
    if data.video_ids is not None:
        selecionados = set(data.video_ids)
        entradas = [e for e in entradas if e["video_id"] in selecionados]

    # A capa da própria playlist tem prioridade sobre a thumbnail do primeiro episódio:
    # preenche antes do loop abaixo, que só age se a série ainda não tiver capa/banner.
    # Baixa em alta resolução (maxresdefault) a partir do vídeo que dá capa à playlist
    # inteira (mesmo vídeo usado no preview) — a URL da extração flat vem cortada/pequena,
    # então não usamos ela aqui.
    capa_playlist = download_youtube_thumbnail(playlist["entradas"][0]["video_id"])
    if capa_playlist:
        preencher_capa_padrao(serie, capa_playlist)

    ja_importados = {e.youtube_video_id for e in serie.episodios if e.youtube_video_id}
    ordem_atual = _proxima_ordem(db, serie_id)
    total_importados = 0
    novos_episodios: list[Episodio] = []

    for entrada in entradas:
        if entrada["video_id"] in ja_importados:
            continue

        episodio = Episodio(
            serie_id=serie_id,
            temporada_id=data.temporada_id,
            titulo=entrada["titulo"],
            descricao=entrada["descricao"],
            thumbnail_url=download_youtube_thumbnail(entrada["video_id"]) or entrada["thumbnail_url"],
            duracao_segundos=entrada["duracao_segundos"],
            ordem=ordem_atual,
            fonte=FonteEpisodio.youtube_embed,
            youtube_video_id=entrada["video_id"],
            status_processamento=StatusProcessamento.pendente if data.baixar else StatusProcessamento.pronto,
        )
        db.add(episodio)
        preencher_capa_padrao(serie, episodio.thumbnail_url)
        novos_episodios.append(episodio)
        ja_importados.add(entrada["video_id"])
        ordem_atual += 1
        total_importados += 1

    log = ImportacaoPlaylist(
        serie_id=serie_id,
        playlist_url=data.playlist_url,
        total_encontrados=len(entradas),
        total_importados=total_importados,
        status=StatusImportacao.concluida,
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    if data.baixar:
        for episodio in novos_episodios:
            background_tasks.add_task(executar_download, episodio.id)

    return log


@router.get("/series/{serie_id}/importacoes", response_model=list[ImportacaoPlaylistOut])
def listar_importacoes(
    serie_id: int, db: Session = Depends(get_db), _admin: Admin = Depends(get_current_admin)
) -> list[ImportacaoPlaylist]:
    _get_serie_or_404(db, serie_id)
    return (
        db.query(ImportacaoPlaylist)
        .filter(ImportacaoPlaylist.serie_id == serie_id)
        .order_by(ImportacaoPlaylist.criado_em.desc())
        .all()
    )
