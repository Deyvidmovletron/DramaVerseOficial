from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Request, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, get_db, get_viewer
from app.models.admin import Admin
from app.models.cliente import Cliente
from app.models.episodio import Episodio, FonteEpisodio, StatusProcessamento
from app.models.serie import Serie, StatusSerie
from app.schemas.episodio import EpisodioOut, EpisodioUpdateIn, EpisodioYoutubeIn, ReordenarEpisodiosIn
from app.services.download_manager import executar_download
from app.services.media_storage import (
    MediaValidationError,
    delete_media_file,
    delete_video_file,
    download_thumbnail,
    generate_video_thumbnail,
    resolve_video_path,
    save_video,
)
from app.services.serie_capa import preencher_capa_padrao
from app.services.video_streaming import stream_video_file
from app.services.youtube_service import YoutubeError, fetch_video_info

router = APIRouter(tags=["episodios"])


def _get_serie_or_404(db: Session, serie_id: int) -> Serie:
    serie = db.get(Serie, serie_id)
    if serie is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Série não encontrada")
    return serie


def _get_episodio_or_404(db: Session, episodio_id: int) -> Episodio:
    episodio = db.get(Episodio, episodio_id)
    if episodio is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Episódio não encontrado")
    return episodio


def _proxima_ordem(db: Session, serie_id: int) -> int:
    ultimo = (
        db.query(Episodio.ordem).filter(Episodio.serie_id == serie_id).order_by(Episodio.ordem.desc()).first()
    )
    return (ultimo[0] + 1) if ultimo else 1


@router.get("/series/{serie_id}/episodios", response_model=list[EpisodioOut])
def listar_episodios(
    serie_id: int, db: Session = Depends(get_db), _admin: Admin = Depends(get_current_admin)
) -> list[Episodio]:
    _get_serie_or_404(db, serie_id)
    return db.query(Episodio).filter(Episodio.serie_id == serie_id).order_by(Episodio.ordem).all()


@router.post("/series/{serie_id}/episodios/youtube", response_model=EpisodioOut, status_code=status.HTTP_201_CREATED)
def adicionar_episodio_youtube(
    serie_id: int,
    data: EpisodioYoutubeIn,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
) -> Episodio:
    serie = _get_serie_or_404(db, serie_id)

    try:
        info = fetch_video_info(data.youtube_url)
    except YoutubeError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    episodio = Episodio(
        serie_id=serie.id,
        temporada_id=data.temporada_id,
        numero=data.numero,
        titulo=info["titulo"],
        descricao=info["descricao"],
        thumbnail_url=download_thumbnail(info["thumbnail_url"]) or info["thumbnail_url"],
        duracao_segundos=info["duracao_segundos"],
        ordem=_proxima_ordem(db, serie_id),
        fonte=FonteEpisodio.youtube_embed,
        youtube_video_id=info["video_id"],
        status_processamento=StatusProcessamento.pendente if data.baixar else StatusProcessamento.pronto,
    )
    db.add(episodio)
    preencher_capa_padrao(serie, episodio.thumbnail_url)
    db.commit()
    db.refresh(episodio)

    if data.baixar:
        background_tasks.add_task(executar_download, episodio.id)

    return episodio


@router.post("/series/{serie_id}/episodios/local", response_model=EpisodioOut, status_code=status.HTTP_201_CREATED)
def adicionar_episodio_local(
    serie_id: int,
    titulo: str = Form(...),
    descricao: str | None = Form(None),
    numero: int | None = Form(None),
    temporada_id: int | None = Form(None),
    arquivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
) -> Episodio:
    serie = _get_serie_or_404(db, serie_id)

    try:
        caminho_relativo = save_video(arquivo)
    except MediaValidationError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    episodio = Episodio(
        serie_id=serie.id,
        temporada_id=temporada_id,
        numero=numero,
        titulo=titulo,
        descricao=descricao,
        thumbnail_url=generate_video_thumbnail(resolve_video_path(caminho_relativo)),
        ordem=_proxima_ordem(db, serie_id),
        fonte=FonteEpisodio.local,
        arquivo_local_path=caminho_relativo,
        status_processamento=StatusProcessamento.pronto,
    )
    db.add(episodio)
    preencher_capa_padrao(serie, episodio.thumbnail_url)
    db.commit()
    db.refresh(episodio)
    return episodio


@router.put("/series/{serie_id}/episodios/reordenar", response_model=list[EpisodioOut])
def reordenar_episodios(
    serie_id: int,
    data: ReordenarEpisodiosIn,
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
) -> list[Episodio]:
    _get_serie_or_404(db, serie_id)

    episodios = db.query(Episodio).filter(Episodio.serie_id == serie_id).all()
    episodios_por_id = {e.id: e for e in episodios}

    if set(data.ordem) != set(episodios_por_id.keys()):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="A lista de ordem deve conter exatamente os episódios da série")

    for posicao, episodio_id in enumerate(data.ordem, start=1):
        episodios_por_id[episodio_id].ordem = posicao
        episodios_por_id[episodio_id].numero = posicao

    db.commit()
    return db.query(Episodio).filter(Episodio.serie_id == serie_id).order_by(Episodio.ordem).all()


@router.put("/episodios/{episodio_id}", response_model=EpisodioOut)
def atualizar_episodio(
    episodio_id: int,
    data: EpisodioUpdateIn,
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
) -> Episodio:
    episodio = _get_episodio_or_404(db, episodio_id)
    episodio.titulo = data.titulo
    episodio.descricao = data.descricao
    episodio.numero = data.numero
    episodio.temporada_id = data.temporada_id
    db.commit()
    db.refresh(episodio)
    return episodio


@router.post("/episodios/{episodio_id}/baixar", response_model=EpisodioOut)
def baixar_episodio(
    episodio_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
) -> Episodio:
    """Inicia (ou tenta novamente, em caso de erro) o download de um episódio do YouTube
    para armazenamento local. Também serve como endpoint de retry."""
    episodio = _get_episodio_or_404(db, episodio_id)

    if not episodio.youtube_video_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Este episódio não é um vídeo do YouTube")
    if episodio.status_processamento == StatusProcessamento.baixando:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Download já em andamento para este episódio")

    episodio.status_processamento = StatusProcessamento.pendente
    db.commit()
    db.refresh(episodio)

    background_tasks.add_task(executar_download, episodio_id)
    return episodio


@router.delete("/episodios/{episodio_id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_episodio(
    episodio_id: int, db: Session = Depends(get_db), _admin: Admin = Depends(get_current_admin)
) -> None:
    episodio = _get_episodio_or_404(db, episodio_id)
    if episodio.fonte in (FonteEpisodio.local, FonteEpisodio.youtube_baixado):
        delete_video_file(episodio.arquivo_local_path)
    delete_media_file(episodio.thumbnail_url)
    db.delete(episodio)
    db.commit()


@router.get("/episodios/{episodio_id}/stream")
def stream_episodio(
    episodio_id: int,
    request: Request,
    db: Session = Depends(get_db),
    viewer: Admin | Cliente = Depends(get_viewer),
) -> StreamingResponse:
    episodio = _get_episodio_or_404(db, episodio_id)

    # Clientes só podem assistir episódios de séries publicadas; admins podem pré-visualizar qualquer uma.
    if isinstance(viewer, Cliente) and episodio.serie.status != StatusSerie.publicado:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Episódio não encontrado")

    fontes_locais = (FonteEpisodio.local, FonteEpisodio.youtube_baixado)
    if episodio.fonte not in fontes_locais or not episodio.arquivo_local_path:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Este episódio não possui um arquivo de vídeo local")

    return stream_video_file(request, resolve_video_path(episodio.arquivo_local_path))
