import hashlib
import hmac
import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import settings
from app.models.assinatura import Assinatura, StatusAssinatura
from app.services.assinatura_service import registrar_pagamento
from app.services.mercadopago_service import (
    MercadoPagoError,
    buscar_invoice,
    buscar_payment,
    buscar_preapproval,
)

router = APIRouter(prefix="/webhooks", tags=["webhooks"])
logger = logging.getLogger(__name__)


def _verificar_assinatura(request: Request, data_id: str) -> bool:
    """Valida o header x-signature do Mercado Pago (HMAC-SHA256), quando um
    MERCADOPAGO_WEBHOOK_SECRET estiver configurado. Sem o secret configurado
    (ex: ambiente de desenvolvimento), a verificação é ignorada."""
    if not settings.mercadopago_webhook_secret:
        return True

    x_signature = request.headers.get("x-signature", "")
    x_request_id = request.headers.get("x-request-id", "")
    partes = dict(p.split("=", 1) for p in x_signature.split(",") if "=" in p)
    ts = partes.get("ts", "")
    v1 = partes.get("v1", "")
    if not ts or not v1:
        return False

    manifest = f"id:{data_id};request-id:{x_request_id};ts:{ts};"
    esperado = hmac.new(settings.mercadopago_webhook_secret.encode(), manifest.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(esperado, v1)


def _processar_preapproval(db: Session, preapproval_id: str) -> None:
    try:
        preapproval = buscar_preapproval(preapproval_id)
    except MercadoPagoError as exc:
        logger.warning("Falha ao consultar preapproval %s: %s", preapproval_id, exc)
        return

    assinatura = db.query(Assinatura).filter(Assinatura.mp_subscription_id == preapproval_id).first()
    if assinatura is None:
        return

    status_mp = preapproval.get("status")
    if status_mp == "authorized":
        agora = datetime.now(timezone.utc)
        assinatura.status = StatusAssinatura.ativa
        if assinatura.data_inicio is None:
            assinatura.data_inicio = agora
        # Só concede acesso provisório se ainda não há validade futura — a data exata vem
        # do webhook do pagamento (registrar_pagamento). Cobrança do cartão é mensal.
        expiracao = assinatura.data_expiracao
        if expiracao is not None and expiracao.tzinfo is None:
            expiracao = expiracao.replace(tzinfo=timezone.utc)
        if expiracao is None or expiracao <= agora:
            assinatura.data_expiracao = agora + timedelta(days=30)
    elif status_mp == "cancelled":
        assinatura.status = StatusAssinatura.cancelada
    elif status_mp == "paused":
        assinatura.status = StatusAssinatura.atrasada

    db.commit()


def _assinatura_do_payment(db: Session, payment: dict) -> Assinatura | None:
    external_reference = payment.get("external_reference")
    if external_reference is not None:
        try:
            ref_id = int(external_reference)
        except (TypeError, ValueError):
            ref_id = None
        if ref_id is not None:
            assinatura = db.query(Assinatura).filter(Assinatura.id == ref_id).first()
            if assinatura is not None:
                return assinatura

    preapproval_id = (
        payment.get("preapproval_id") or (payment.get("metadata") or {}).get("preapproval_id")
    )
    if preapproval_id:
        return db.query(Assinatura).filter(Assinatura.mp_subscription_id == str(preapproval_id)).first()

    return None


def _processar_payment(db: Session, payment_id: str) -> None:
    try:
        payment = buscar_payment(payment_id)
    except MercadoPagoError as exc:
        logger.warning("Falha ao consultar payment %s: %s", payment_id, exc)
        return

    assinatura = _assinatura_do_payment(db, payment)
    if assinatura is None:
        logger.warning("Payment %s sem assinatura correspondente", payment_id)
        return

    # None = notificação duplicada (o Mercado Pago reenvia o mesmo evento em retries, ou o
    # polling do PIX já tinha processado esse pagamento antes) — nada a fazer.
    registrar_pagamento(db, assinatura, payment)


def _processar_invoice(db: Session, invoice_id: str) -> None:
    """Cobrança recorrente mensal (webhook `subscription_authorized_payment`). O recurso é
    uma 'invoice' da preapproval; dela extraímos o pagamento real e reusamos
    registrar_pagamento (idempotente por mp_payment_id)."""
    try:
        invoice = buscar_invoice(invoice_id)
    except MercadoPagoError as exc:
        # Alguns eventos `subscription_authorized_payment` trazem direto um payment_id.
        logger.info("Invoice %s não encontrada, tentando como payment: %s", invoice_id, exc)
        _processar_payment(db, invoice_id)
        return

    dados_pagamento = invoice.get("payment") or {}
    payment_id = dados_pagamento.get("id")
    if not payment_id:
        logger.info("Invoice %s ainda sem pagamento associado", invoice_id)
        return

    # Busca o payment real (status/valor definitivos); se falhar, usa os dados da invoice.
    try:
        payment = buscar_payment(str(payment_id))
    except MercadoPagoError:
        payment = {
            "id": payment_id,
            "status": dados_pagamento.get("status"),
            "transaction_amount": invoice.get("transaction_amount"),
            "external_reference": invoice.get("external_reference"),
            "preapproval_id": invoice.get("preapproval_id"),
        }

    assinatura = _assinatura_do_payment(db, payment)
    if assinatura is None and invoice.get("preapproval_id"):
        assinatura = (
            db.query(Assinatura).filter(Assinatura.mp_subscription_id == str(invoice["preapproval_id"])).first()
        )
    if assinatura is None:
        logger.warning("Invoice %s sem assinatura correspondente", invoice_id)
        return

    registrar_pagamento(db, assinatura, payment)


@router.post("/mercadopago", status_code=status.HTTP_200_OK)
async def webhook_mercadopago(request: Request, db: Session = Depends(get_db)) -> dict:
    try:
        body = await request.json()
    except Exception:
        body = {}

    tipo = body.get("type") or request.query_params.get("type") or request.query_params.get("topic")

    recurso_id = None
    if isinstance(body.get("data"), dict):
        recurso_id = body["data"].get("id")
    recurso_id = recurso_id or request.query_params.get("data.id") or request.query_params.get("id")

    if not tipo or not recurso_id:
        return {"status": "ignorado"}

    if not _verificar_assinatura(request, str(recurso_id)):
        logger.warning("Assinatura do webhook do Mercado Pago inválida")
        return {"status": "assinatura_invalida"}

    if tipo == "subscription_preapproval":
        _processar_preapproval(db, str(recurso_id))
    elif tipo == "subscription_authorized_payment":
        # Cobrança recorrente mensal gerada pelo MP a partir da preapproval.
        _processar_invoice(db, str(recurso_id))
    elif tipo == "payment":
        _processar_payment(db, str(recurso_id))

    return {"status": "ok"}
