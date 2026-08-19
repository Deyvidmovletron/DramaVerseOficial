from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, get_db
from app.models.admin import Admin
from app.models.serie import Serie
from app.models.temporada import Temporada
from app.schemas.temporada import TemporadaCreate, TemporadaOut, TemporadaUpdate

router = APIRouter(tags=["temporadas"])


def _get_serie_or_404(db: Session, serie_id: int) -> Serie:
    serie = db.get(Serie, serie_id)
    if serie is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Série não encontrada")
    return serie


def _get_temporada_or_404(db: Session, temporada_id: int) -> Temporada:
    temporada = db.get(Temporada, temporada_id)
    if temporada is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Temporada não encontrada")
    return temporada


@router.get("/series/{serie_id}/temporadas", response_model=list[TemporadaOut])
def listar_temporadas(
    serie_id: int, db: Session = Depends(get_db), _admin: Admin = Depends(get_current_admin)
) -> list[Temporada]:
    _get_serie_or_404(db, serie_id)
    return db.query(Temporada).filter(Temporada.serie_id == serie_id).order_by(Temporada.numero).all()


@router.post("/series/{serie_id}/temporadas", response_model=TemporadaOut, status_code=status.HTTP_201_CREATED)
def criar_temporada(
    serie_id: int,
    data: TemporadaCreate,
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
) -> Temporada:
    _get_serie_or_404(db, serie_id)
    temporada = Temporada(serie_id=serie_id, numero=data.numero, titulo=data.titulo)
    db.add(temporada)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Já existe uma temporada com esse número") from exc
    db.refresh(temporada)
    return temporada


@router.put("/temporadas/{temporada_id}", response_model=TemporadaOut)
def atualizar_temporada(
    temporada_id: int,
    data: TemporadaUpdate,
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
) -> Temporada:
    temporada = _get_temporada_or_404(db, temporada_id)
    temporada.numero = data.numero
    temporada.titulo = data.titulo
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Já existe uma temporada com esse número") from exc
    db.refresh(temporada)
    return temporada


@router.delete("/temporadas/{temporada_id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_temporada(
    temporada_id: int, db: Session = Depends(get_db), _admin: Admin = Depends(get_current_admin)
) -> None:
    temporada = _get_temporada_or_404(db, temporada_id)
    db.delete(temporada)
    db.commit()
