from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, get_db
from app.models.admin import Admin
from app.models.categoria import Categoria
from app.schemas.categoria import CategoriaCreate, CategoriaOut, CategoriaUpdate

router = APIRouter(prefix="/categorias", tags=["categorias"])


@router.get("", response_model=list[CategoriaOut])
def listar_categorias(
    db: Session = Depends(get_db), _admin: Admin = Depends(get_current_admin)
) -> list[Categoria]:
    return db.query(Categoria).order_by(Categoria.nome).all()


@router.post("", response_model=CategoriaOut, status_code=status.HTTP_201_CREATED)
def criar_categoria(
    data: CategoriaCreate, db: Session = Depends(get_db), _admin: Admin = Depends(get_current_admin)
) -> Categoria:
    categoria = Categoria(nome=data.nome.strip())
    db.add(categoria)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Já existe uma categoria com esse nome") from exc
    db.refresh(categoria)
    return categoria


@router.put("/{categoria_id}", response_model=CategoriaOut)
def atualizar_categoria(
    categoria_id: int,
    data: CategoriaUpdate,
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
) -> Categoria:
    categoria = db.get(Categoria, categoria_id)
    if categoria is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Categoria não encontrada")

    categoria.nome = data.nome.strip()
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Já existe uma categoria com esse nome") from exc
    db.refresh(categoria)
    return categoria


@router.delete("/{categoria_id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_categoria(
    categoria_id: int, db: Session = Depends(get_db), _admin: Admin = Depends(get_current_admin)
) -> None:
    categoria = db.get(Categoria, categoria_id)
    if categoria is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Categoria não encontrada")

    db.delete(categoria)
    db.commit()
