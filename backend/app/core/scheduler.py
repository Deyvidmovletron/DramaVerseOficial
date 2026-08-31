import logging
from datetime import datetime, timedelta

from apscheduler.schedulers.background import BackgroundScheduler

from app.db.session import SessionLocal
from app.models.assinatura import Assinatura, StatusAssinatura
from app.services.assinatura_service import registrar_pagamento
from app.services.mercadopago_service import (
    MercadoPagoError,
    buscar_payment_aprovado_por_referencia,
    buscar_preapproval,
    buscar_ultima_invoice_aprovada,
)

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler(timezone="UTC")


def verificar_assinaturas_vencidas() -> None:
    """Marca como 'atrasada' qualquer assinatura vigente (paga OU em teste grátis) cuja
    data de expiração já passou. Para o teste grátis é o mecanismo principal de bloqueio
    ("assim que o teste termina, o painel bloqueia e o cliente é obrigado a pagar"); para
    a assinatura paga é uma rede de segurança caso um webhook do Mercado Pago falhe."""
    db = SessionLocal()
    try:
        agora = datetime.utcnow()
        vencidas = (
            db.query(Assinatura)
            .filter(
                Assinatura.status.in_((StatusAssinatura.ativa, StatusAssinatura.teste)),
                Assinatura.data_expiracao.isnot(None),
                Assinatura.data_expiracao < agora,
            )
            .all()
        )
        for assinatura in vencidas:
            assinatura.status = StatusAssinatura.atrasada

        if vencidas:
            db.commit()
            logger.info("Marcadas %d assinatura(s) como atrasada(s)", len(vencidas))
    finally:
        db.close()


def reconciliar_recorrencias_atrasadas() -> None:
    """Rede de segurança para falhas de entrega de webhook: para toda assinatura recorrente
    de cartão marcada como 'atrasada' recentemente, consulta o Mercado Pago e reativa se a
    preapproval ainda está autorizada e há um pagamento aprovado recente."""
    db = SessionLocal()
    try:
        limite = datetime.utcnow() - timedelta(days=7)
        candidatas = (
            db.query(Assinatura)
            .filter(
                Assinatura.status == StatusAssinatura.atrasada,
                Assinatura.mp_subscription_id.isnot(None),
                Assinatura.data_expiracao.isnot(None),
                Assinatura.data_expiracao >= limite,
            )
            .all()
        )
        for assinatura in candidatas:
            try:
                preapproval = buscar_preapproval(assinatura.mp_subscription_id)
                if preapproval.get("status") != "authorized":
                    continue

                payment = buscar_payment_aprovado_por_referencia(str(assinatura.id))
                if payment is None:
                    invoice = buscar_ultima_invoice_aprovada(assinatura.mp_subscription_id)
                    dados = (invoice or {}).get("payment") or {}
                    if dados.get("id"):
                        payment = {
                            "id": dados["id"],
                            "status": "approved",
                            "transaction_amount": invoice.get("transaction_amount"),
                            "external_reference": str(assinatura.id),
                        }

                if payment is not None:
                    registrar_pagamento(db, assinatura, payment)
                    logger.info("Assinatura %s reativada por reconciliação com o MP", assinatura.id)
            except MercadoPagoError as exc:
                logger.warning("Falha ao reconciliar assinatura %s: %s", assinatura.id, exc)
    finally:
        db.close()


def iniciar_scheduler() -> None:
    if not scheduler.running:
        scheduler.add_job(
            verificar_assinaturas_vencidas,
            "interval",
            minutes=15,
            id="verificar_assinaturas_vencidas",
            replace_existing=True,
            next_run_time=datetime.utcnow(),
        )
        scheduler.add_job(
            reconciliar_recorrencias_atrasadas,
            "interval",
            hours=6,
            id="reconciliar_recorrencias_atrasadas",
            replace_existing=True,
        )
        scheduler.start()


def parar_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
