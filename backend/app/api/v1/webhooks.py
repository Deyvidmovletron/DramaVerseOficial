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
from app.services.mercadopago_service import MercadoPagoError, buscar_payment, buscar_preapproval

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
        assinatura.data_expiracao = agora + timedelta(days=assinatura.plano.duracao_dias)
    elif status_mp == "cancelled":
        assinatura.status = StatusAssinatura.cancelada
    elif status_mp == "paused":
        assinatura.status = StatusAssinatura.atrasada

    db.commit()


def _processar_payment(db: Session, payment_id: str) -> None:
    try:
        payment = buscar_payment(payment_id)
    except MercadoPagoError as exc:
        logger.warning("Falha ao consultar payment %s: %s", payment_id, exc)
        return

    assinatura = None
    external_reference = payment.get("external_reference")
    if external_reference:
        assinatura = db.query(Assinatura).filter(Assinatura.id == int(external_reference)).first()

    if assinatura is None:
        preapproval_id = payment.get("preapproval_id")
        if preapproval_id:
            assinatura = db.query(Assinatura).filter(Assinatura.mp_subscription_id == preapproval_id).first()

    if assinatura is None:
        logger.warning("Payment %s sem assinatura correspondente", payment_id)
        return

    # None = notificação duplicada (o Mercado Pago reenvia o mesmo evento em retries, ou o
    # polling do PIX já tinha processado esse pagamento antes) — nada a fazer.
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
    elif tipo == "payment":
        _processar_payment(db, str(recurso_id))

    return {"status": "ok"}
