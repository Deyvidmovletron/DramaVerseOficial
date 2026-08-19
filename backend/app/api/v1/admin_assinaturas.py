import math
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_admin, get_db
from app.models.admin import Admin
from app.models.assinatura import Assinatura, StatusAssinatura
from app.models.cliente import Cliente
from app.models.plano import Plano
from app.schemas.admin_cliente import (
    AssinaturaAdminCreateIn,
    AssinaturaAdminListOut,
    AssinaturaAdminOut,
    AssinaturaAdminUpdateIn,
)

router = APIRouter(prefix="/admin/assinaturas", tags=["admin-assinaturas"])
PAGE_SIZE_PADRAO = 20


def assinatura_to_admin_out(assinatura: Assinatura) -> AssinaturaAdminOut:
    return AssinaturaAdminOut(
        id=assinatura.id,
        cliente_id=assinatura.cliente_id,
        cliente_nome=assinatura.cliente.nome,
        cliente_email=assinatura.cliente.email,
        plano_id=assinatura.plano_id,
        plano_nome=assinatura.plano.nome,
        status=assinatura.status,
        data_inicio=assinatura.data_inicio,
        data_expiracao=assinatura.data_expiracao,
        data_proximo_pagamento=assinatura.data_proximo_pagamento,
        mp_subscription_id=assinatura.mp_subscription_id,
        criado_em=assinatura.criado_em,
    )


@router.get("", response_model=AssinaturaAdminListOut)
def listar_assinaturas(
    busca: str | None = None,
    status_filtro: StatusAssinatura | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(PAGE_SIZE_PADRAO, ge=1, le=100),
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
) -> AssinaturaAdminListOut:
    """Todas as assinaturas de todos os clientes — criadas manualmente aqui ou
    automaticamente por um checkout (cartão, PIX ou o fluxo de redirect) aparecem juntas,
    é a mesma tabela."""
    query = (
        db.query(Assinatura)
        .join(Cliente, Assinatura.cliente_id == Cliente.id)
        .options(selectinload(Assinatura.cliente), selectinload(Assinatura.plano))
    )
    if busca:
        query = query.filter((Cliente.nome.ilike(f"%{busca}%")) | (Cliente.email.ilike(f"%{busca}%")))
    if status_filtro:
        query = query.filter(Assinatura.status == status_filtro)

    total = query.count()
    assinaturas = query.order_by(Assinatura.criado_em.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return AssinaturaAdminListOut(
        itens=[assinatura_to_admin_out(a) for a in assinaturas],
        total=total,
        pagina=page,
        total_paginas=max(1, math.ceil(total / page_size)),
    )


@router.post("", response_model=AssinaturaAdminOut, status_code=status.HTTP_201_CREATED)
def criar_assinatura_manual(
    data: AssinaturaAdminCreateIn, db: Session = Depends(get_db), _admin: Admin = Depends(get_current_admin)
) -> AssinaturaAdminOut:
    """Cada cliente tem no máximo uma assinatura — se ele já tiver uma, use PUT
    /admin/assinaturas/{id} pra editar em vez de criar outra (rejeitado, não sobrescreve
    silenciosamente: criar é uma ação deliberada, o admin pode não saber que já existe uma)."""
    cliente = db.get(Cliente, data.cliente_id)
    if cliente is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Cliente não encontrado")
    if cliente.assinatura is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail="Esse cliente já tem uma assinatura. Edite a existente em vez de criar outra.",
        )
    plano = db.get(Plano, data.plano_id)
    if plano is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Plano não encontrado")

    data_inicio = data.data_inicio
    data_expiracao = data.data_expiracao
    if data.status == StatusAssinatura.ativa:
        if data_inicio is None:
            data_inicio = datetime.now(timezone.utc)
        if data_expiracao is None:
            data_expiracao = data_inicio + timedelta(days=plano.duracao_dias)

    assinatura = Assinatura(
        cliente_id=cliente.id,
        plano_id=plano.id,
        status=data.status,
        data_inicio=data_inicio,
        data_expiracao=data_expiracao,
    )
    db.add(assinatura)
    db.commit()
    db.refresh(assinatura)
    return assinatura_to_admin_out(assinatura)


@router.put("/{assinatura_id}", response_model=AssinaturaAdminOut)
def atualizar_assinatura(
    assinatura_id: int,
    data: AssinaturaAdminUpdateIn,
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
) -> AssinaturaAdminOut:
    assinatura = (
        db.query(Assinatura)
        .options(selectinload(Assinatura.cliente), selectinload(Assinatura.plano))
        .filter(Assinatura.id == assinatura_id)
        .first()
    )
    if assinatura is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Assinatura não encontrada")

    if data.plano_id is not None and data.plano_id != assinatura.plano_id:
        plano = db.get(Plano, data.plano_id)
        if plano is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Plano não encontrado")
        assinatura.plano_id = plano.id
        assinatura.plano = plano

    assinatura.status = data.status
    if data.data_inicio is not None:
        assinatura.data_inicio = data.data_inicio
    assinatura.data_expiracao = data.data_expiracao

    db.commit()
    db.refresh(assinatura)
    return assinatura_to_admin_out(assinatura)


@router.delete("/{assinatura_id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_assinatura(
    assinatura_id: int, db: Session = Depends(get_db), _admin: Admin = Depends(get_current_admin)
) -> None:
    assinatura = db.get(Assinatura, assinatura_id)
    if assinatura is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Assinatura não encontrada")
    db.delete(assinatura)
    db.commit()
