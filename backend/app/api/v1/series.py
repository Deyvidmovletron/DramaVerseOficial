import math

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_admin, get_db
from app.models.admin import Admin
from app.models.episodio import FonteEpisodio
from app.models.serie import Serie, StatusSerie
from app.schemas.serie import SerieCreate, SerieListOut, SerieOut, SerieUpdate
from app.services.media_storage import MediaValidationError, delete_media_file, delete_video_file, save_image

router = APIRouter(prefix="/series", tags=["series"])
PAGE_SIZE_PADRAO = 20


def _to_out(serie: Serie) -> SerieOut:
    return SerieOut(
        id=serie.id,
        titulo=serie.titulo,
        sinopse=serie.sinopse,
        categoria=serie.categoria,
        capa_url=serie.capa_url,
        banner_url=serie.banner_url,
        ano=serie.ano,
        status=serie.status,
        criado_em=serie.criado_em,
        total_episodios=len(serie.episodios),
    )


def _get_serie_or_404(db: Session, serie_id: int) -> Serie:
    serie = (
        db.query(Serie)
        .options(selectinload(Serie.categoria), selectinload(Serie.episodios))
        .filter(Serie.id == serie_id)
        .first()
    )
    if serie is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Série não encontrada")
    return serie


@router.get("", response_model=SerieListOut)
def listar_series(
    categoria_id: int | None = None,
    status_serie: StatusSerie | None = None,
    busca: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(PAGE_SIZE_PADRAO, ge=1, le=100),
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
) -> SerieListOut:
    query = db.query(Serie).options(selectinload(Serie.categoria), selectinload(Serie.episodios))

    if categoria_id is not None:
        query = query.filter(Serie.categoria_id == categoria_id)
    if status_serie is not None:
        query = query.filter(Serie.status == status_serie)
    if busca:
        query = query.filter(Serie.titulo.ilike(f"%{busca}%"))

    total = query.count()
    series = (
        query.order_by(Serie.criado_em.desc()).offset((page - 1) * page_size).limit(page_size).all()
    )

    return SerieListOut(
        itens=[_to_out(s) for s in series],
        total=total,
        pagina=page,
        total_paginas=max(1, math.ceil(total / page_size)),
    )


@router.get("/{serie_id}", response_model=SerieOut)
def obter_serie(
    serie_id: int, db: Session = Depends(get_db), _admin: Admin = Depends(get_current_admin)
) -> SerieOut:
    return _to_out(_get_serie_or_404(db, serie_id))


@router.post("", response_model=SerieOut, status_code=status.HTTP_201_CREATED)
def criar_serie(
    data: SerieCreate, db: Session = Depends(get_db), _admin: Admin = Depends(get_current_admin)
) -> SerieOut:
    serie = Serie(**data.model_dump())
    db.add(serie)
    db.commit()
    return _to_out(_get_serie_or_404(db, serie.id))


@router.put("/{serie_id}", response_model=SerieOut)
def atualizar_serie(
    serie_id: int,
    data: SerieUpdate,
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
) -> SerieOut:
    serie = _get_serie_or_404(db, serie_id)
    for field, value in data.model_dump().items():
        setattr(serie, field, value)
    db.commit()
    return _to_out(_get_serie_or_404(db, serie_id))


@router.delete("/{serie_id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_serie(
    serie_id: int, db: Session = Depends(get_db), _admin: Admin = Depends(get_current_admin)
) -> None:
    serie = _get_serie_or_404(db, serie_id)
    delete_media_file(serie.capa_url)
    delete_media_file(serie.banner_url)
    for episodio in serie.episodios:
        if episodio.fonte in (FonteEpisodio.local, FonteEpisodio.youtube_baixado):
            delete_video_file(episodio.arquivo_local_path)
        delete_media_file(episodio.thumbnail_url)
    db.delete(serie)
    db.commit()


@router.post("/{serie_id}/capa", response_model=SerieOut)
def upload_capa(
    serie_id: int,
    arquivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
) -> SerieOut:
    serie = _get_serie_or_404(db, serie_id)
    try:
        url = save_image(arquivo, "covers")
    except MediaValidationError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    delete_media_file(serie.capa_url)
    serie.capa_url = url
    db.commit()
    return _to_out(_get_serie_or_404(db, serie_id))


@router.post("/{serie_id}/banner", response_model=SerieOut)
def upload_banner(
    serie_id: int,
    arquivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
) -> SerieOut:
    serie = _get_serie_or_404(db, serie_id)
    try:
        url = save_image(arquivo, "banners")
    except MediaValidationError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    delete_media_file(serie.banner_url)
    serie.banner_url = url
    db.commit()
    return _to_out(_get_serie_or_404(db, serie_id))
