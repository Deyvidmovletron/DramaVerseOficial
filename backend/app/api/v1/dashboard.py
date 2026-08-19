from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_admin, get_db
from app.models.admin import Admin
from app.models.assinatura import Assinatura, StatusAssinatura
from app.models.cliente import Cliente, StatusCliente
from app.models.episodio import Episodio
from app.models.pagamento import Pagamento, StatusPagamento
from app.models.serie import Serie
from app.schemas.dashboard import DashboardOut
from app.services.assinatura_service import assinatura_vigente

router = APIRouter(prefix="/admin/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardOut)
def obter_dashboard(db: Session = Depends(get_db), _admin: Admin = Depends(get_current_admin)) -> DashboardOut:
    agora = datetime.utcnow()
    inicio_mes = agora.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    clientes = db.query(Cliente).options(selectinload(Cliente.assinatura)).all()
    total_clientes = len(clientes)
    clientes_bloqueados = sum(1 for c in clientes if c.status == StatusCliente.bloqueado)
    clientes_ativos = total_clientes - clientes_bloqueados

    total_series = db.query(Serie).count()
    total_episodios = db.query(Episodio).count()

    # Cada cliente tem no máximo uma assinatura (constraint única em cliente_id), então
    # não tem mais como um cliente contar 2+ vezes aqui. O que ainda vale reaproveitar é
    # assinatura_vigente() — a mesma função que controla o acesso real ao catálogo — em
    # vez de confiar cegamente na coluna `status` (que só é corrigida por um scheduler que
    # roda a cada 24h, ver core/scheduler.py).
    assinaturas_ativas = 0
    assinaturas_atrasadas = 0
    for cliente in clientes:
        if cliente.assinatura is None:
            continue
        if assinatura_vigente(cliente) is not None:
            assinaturas_ativas += 1
        elif cliente.assinatura.status in (StatusAssinatura.ativa, StatusAssinatura.atrasada):
            # Tinha assinatura ativa/atrasada mas não é mais vigente (expirou, e o
            # scheduler ainda não passou por ela, ou expirou "atrasada" mesmo).
            assinaturas_atrasadas += 1
        # "cancelada"/"pendente" sem vigência: não é assinante ativo nem atrasado, é só
        # alguém que nunca chegou a pagar ou cancelou de propósito — não conta em nenhum dos dois.

    novas_assinaturas_mes = db.query(Assinatura).filter(Assinatura.criado_em >= inicio_mes).count()

    receita_mes = (
        db.query(func.coalesce(func.sum(Pagamento.valor_centavos), 0))
        .filter(Pagamento.status == StatusPagamento.aprovado, Pagamento.criado_em >= inicio_mes)
        .scalar()
    )

    return DashboardOut(
        total_clientes=total_clientes,
        clientes_ativos=clientes_ativos,
        clientes_bloqueados=clientes_bloqueados,
        total_series=total_series,
        total_episodios=total_episodios,
        assinaturas_ativas=assinaturas_ativas,
        assinaturas_atrasadas=assinaturas_atrasadas,
        novas_assinaturas_mes=novas_assinaturas_mes,
        receita_mes_centavos=int(receita_mes or 0),
    )
