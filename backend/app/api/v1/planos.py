from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, get_current_cliente, get_db
from app.models.admin import Admin
from app.models.assinatura import Assinatura
from app.models.cliente import Cliente
from app.models.plano import Plano
from app.schemas.plano import PlanoCreate, PlanoOut, PlanoUpdate

router = APIRouter(prefix="/planos", tags=["planos"])


def _get_plano_or_404(db: Session, plano_id: int) -> Plano:
    plano = db.get(Plano, plano_id)
    if plano is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Plano não encontrado")
    return plano


@router.get("", response_model=list[PlanoOut])
def listar_planos(db: Session = Depends(get_db), _admin: Admin = Depends(get_current_admin)) -> list[Plano]:
    return db.query(Plano).order_by(Plano.criado_em.desc()).all()


@router.get("/publicos", response_model=list[PlanoOut])
def listar_planos_publicos(
    db: Session = Depends(get_db), _cliente: Cliente = Depends(get_current_cliente)
) -> list[Plano]:
    """Planos ativos disponíveis para o cliente assinar (não requer assinatura ativa)."""
    return db.query(Plano).filter(Plano.ativo.is_(True)).order_by(Plano.preco_centavos).all()


@router.post("", response_model=PlanoOut, status_code=status.HTTP_201_CREATED)
def criar_plano(
    data: PlanoCreate, db: Session = Depends(get_db), _admin: Admin = Depends(get_current_admin)
) -> Plano:
    plano = Plano(**data.model_dump())
    db.add(plano)
    db.commit()
    db.refresh(plano)
    return plano


@router.put("/{plano_id}", response_model=PlanoOut)
def atualizar_plano(
    plano_id: int, data: PlanoUpdate, db: Session = Depends(get_db), _admin: Admin = Depends(get_current_admin)
) -> Plano:
    plano = _get_plano_or_404(db, plano_id)
    for field, value in data.model_dump().items():
        setattr(plano, field, value)
    db.commit()
    db.refresh(plano)
    return plano


@router.delete("/{plano_id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_plano(
    plano_id: int, db: Session = Depends(get_db), _admin: Admin = Depends(get_current_admin)
) -> None:
    plano = _get_plano_or_404(db, plano_id)
    em_uso = db.query(Assinatura).filter(Assinatura.plano_id == plano_id).first() is not None
    if em_uso:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail="Este plano possui assinaturas vinculadas. Desative-o em vez de excluir.",
        )
    db.delete(plano)
    db.commit()
