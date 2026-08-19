import math

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_admin, get_db
from app.api.v1.admin_assinaturas import assinatura_to_admin_out
from app.core.security import hash_password
from app.models.admin import Admin
from app.models.assinatura import Assinatura
from app.models.cliente import Cliente, StatusCliente
from app.models.plano import Plano
from app.schemas.admin_cliente import (
    AssinaturaAdminOut,
    AssinaturaAdminUpdateIn,
    AtribuirAssinaturaIn,
    ClienteAdminOut,
    ClienteCreateIn,
    ClienteListOut,
    ClienteUpdateIn,
)
from app.services.assinatura_service import atribuir_plano_ativo

router = APIRouter(prefix="/admin/clientes", tags=["admin-clientes"])
PAGE_SIZE_PADRAO = 20


def _get_cliente_or_404(db: Session, cliente_id: int) -> Cliente:
    cliente = (
        db.query(Cliente)
        .options(selectinload(Cliente.assinatura).selectinload(Assinatura.plano))
        .filter(Cliente.id == cliente_id)
        .first()
    )
    if cliente is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Cliente não encontrado")
    return cliente


def _to_out(cliente: Cliente) -> ClienteAdminOut:
    assinatura = cliente.assinatura
    return ClienteAdminOut(
        id=cliente.id,
        nome=cliente.nome,
        email=cliente.email,
        status=cliente.status,
        criado_em=cliente.criado_em,
        plano_atual_id=assinatura.plano_id if assinatura else None,
        plano_atual=assinatura.plano.nome if assinatura else None,
        assinatura_status=assinatura.status.value if assinatura else None,
        data_expiracao=assinatura.data_expiracao if assinatura else None,
    )


def _plano_ou_404(db: Session, plano_id: int) -> Plano:
    plano = db.get(Plano, plano_id)
    if plano is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Plano não encontrado")
    return plano


@router.get("", response_model=ClienteListOut)
def listar_clientes(
    busca: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(PAGE_SIZE_PADRAO, ge=1, le=100),
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
) -> ClienteListOut:
    query = db.query(Cliente).options(selectinload(Cliente.assinatura).selectinload(Assinatura.plano))

    if busca:
        query = query.filter((Cliente.nome.ilike(f"%{busca}%")) | (Cliente.email.ilike(f"%{busca}%")))

    total = query.count()
    clientes = query.order_by(Cliente.criado_em.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return ClienteListOut(
        itens=[_to_out(c) for c in clientes],
        total=total,
        pagina=page,
        total_paginas=max(1, math.ceil(total / page_size)),
    )


@router.post("", response_model=ClienteAdminOut, status_code=status.HTTP_201_CREATED)
def criar_cliente(
    data: ClienteCreateIn, db: Session = Depends(get_db), _admin: Admin = Depends(get_current_admin)
) -> ClienteAdminOut:
    cliente = Cliente(
        nome=data.nome, email=data.email, senha_hash=hash_password(data.senha), status=StatusCliente.ativo
    )
    db.add(cliente)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Já existe um cliente com esse e-mail") from exc
    db.refresh(cliente)

    if data.plano_id is not None:
        atribuir_plano_ativo(db, cliente, _plano_ou_404(db, data.plano_id))

    return _to_out(_get_cliente_or_404(db, cliente.id))


@router.put("/{cliente_id}", response_model=ClienteAdminOut)
def atualizar_cliente(
    cliente_id: int,
    data: ClienteUpdateIn,
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
) -> ClienteAdminOut:
    cliente = _get_cliente_or_404(db, cliente_id)
    if data.status == StatusCliente.bloqueado and cliente.status != StatusCliente.bloqueado:
        cliente.token_version += 1  # derruba sessões abertas na hora, não só no próximo login
    cliente.nome = data.nome
    cliente.email = data.email
    cliente.status = data.status
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Já existe um cliente com esse e-mail") from exc

    return _to_out(_get_cliente_or_404(db, cliente_id))


@router.delete("/{cliente_id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_cliente(
    cliente_id: int, db: Session = Depends(get_db), _admin: Admin = Depends(get_current_admin)
) -> None:
    cliente = _get_cliente_or_404(db, cliente_id)
    db.delete(cliente)
    db.commit()


@router.post("/{cliente_id}/assinatura", response_model=ClienteAdminOut)
def atribuir_assinatura(
    cliente_id: int,
    data: AtribuirAssinaturaIn,
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
) -> ClienteAdminOut:
    """Ativa um plano pro cliente na hora. Cada cliente tem no máximo uma assinatura —
    chamar de novo (outro plano, ou repetir o mesmo) atualiza a existente, nunca cria
    outra linha."""
    cliente = _get_cliente_or_404(db, cliente_id)
    atribuir_plano_ativo(db, cliente, _plano_ou_404(db, data.plano_id))
    return _to_out(_get_cliente_or_404(db, cliente_id))


@router.get("/{cliente_id}/assinatura", response_model=AssinaturaAdminOut | None)
def obter_assinatura_cliente(
    cliente_id: int, db: Session = Depends(get_db), _admin: Admin = Depends(get_current_admin)
) -> AssinaturaAdminOut | None:
    cliente = _get_cliente_or_404(db, cliente_id)
    return assinatura_to_admin_out(cliente.assinatura) if cliente.assinatura else None


@router.put("/{cliente_id}/assinatura", response_model=AssinaturaAdminOut)
def atualizar_assinatura_cliente(
    cliente_id: int,
    data: AssinaturaAdminUpdateIn,
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
) -> AssinaturaAdminOut:
    """Correção manual (ex: estender validade, marcar como cancelada) — não dispara
    nada no Mercado Pago, só ajusta o registro local."""
    cliente = _get_cliente_or_404(db, cliente_id)
    assinatura = cliente.assinatura
    if assinatura is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Esse cliente ainda não tem uma assinatura")

    if data.plano_id is not None and data.plano_id != assinatura.plano_id:
        assinatura.plano = _plano_ou_404(db, data.plano_id)

    assinatura.status = data.status
    if data.data_inicio is not None:
        assinatura.data_inicio = data.data_inicio
    assinatura.data_expiracao = data.data_expiracao
    db.commit()
    db.refresh(assinatura)
    return assinatura_to_admin_out(assinatura)
