from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_cliente, get_db
from app.models.assinatura import Assinatura, StatusAssinatura
from app.models.cliente import Cliente
from app.models.plano import Plano
from app.schemas.assinatura import (
    CheckoutCartaoIn,
    CheckoutCartaoOut,
    CheckoutIn,
    CheckoutOut,
    CheckoutPixIn,
    CheckoutPixOut,
    VerificarPagamentoOut,
)
from app.services.assinatura_service import preparar_assinatura_para_checkout, registrar_pagamento
from app.services.mercadopago_service import (
    MercadoPagoError,
    buscar_payment_aprovado_por_referencia,
    criar_pagamento_pix,
    criar_preapproval,
    mensagem_rejeicao,
)

router = APIRouter(prefix="/assinaturas", tags=["assinaturas"])


def _plano_ativo_ou_404(db: Session, plano_id: int) -> Plano:
    plano = db.query(Plano).filter(Plano.id == plano_id, Plano.ativo.is_(True)).first()
    if plano is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Plano não encontrado ou inativo")
    return plano


@router.post("/checkout", response_model=CheckoutOut)
def criar_checkout(
    data: CheckoutIn, db: Session = Depends(get_db), cliente: Cliente = Depends(get_current_cliente)
) -> CheckoutOut:
    """Fluxo legado: cria a preapproval sem cartão tokenizado e devolve a URL do checkout
    hospedado pelo Mercado Pago (usuário é redirecionado). Mantido como alternativa caso o
    checkout embutido (/checkout/cartao, /checkout/pix) não possa ser usado — ex: o SDK do
    Mercado Pago falhar ao carregar no navegador do cliente."""
    plano = _plano_ativo_ou_404(db, data.plano_id)

    # Cada cliente tem no máximo uma assinatura — reaproveita a existente (ex: tentando
    # pagar de novo, ou trocando de plano) em vez de criar outra linha. Só apaga no
    # rollback abaixo se essa linha foi criada agora mesmo (nova); se já existia, o
    # cliente mantém o próprio histórico mesmo que este checkout falhe.
    era_nova = cliente.assinatura is None
    assinatura = preparar_assinatura_para_checkout(db, cliente, plano)

    try:
        preapproval = criar_preapproval(
            cliente_email=cliente.email,
            plano_nome=plano.nome,
            valor_reais=plano.preco_centavos / 100,
            frequencia_dias=plano.duracao_dias,
            external_reference=str(assinatura.id),
        )
    except MercadoPagoError as exc:
        if era_nova:
            db.delete(assinatura)
            db.commit()
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    assinatura.mp_subscription_id = preapproval["id"]
    db.commit()

    return CheckoutOut(checkout_url=preapproval["init_point"])


@router.post("/checkout/cartao", response_model=CheckoutCartaoOut)
def criar_checkout_cartao(
    data: CheckoutCartaoIn, db: Session = Depends(get_db), cliente: Cliente = Depends(get_current_cliente)
) -> CheckoutCartaoOut:
    """Checkout embutido com cartão: `card_token_id` já veio tokenizado do MP.js no
    frontend (o número do cartão nunca passa por este backend). A preapproval é criada já
    associada ao cartão — autorizada na hora, sem redirect pro checkout do Mercado Pago."""
    plano = _plano_ativo_ou_404(db, data.plano_id)

    era_nova = cliente.assinatura is None
    assinatura = preparar_assinatura_para_checkout(db, cliente, plano)

    try:
        preapproval = criar_preapproval(
            cliente_email=cliente.email,
            plano_nome=plano.nome,
            valor_reais=plano.preco_centavos / 100,
            frequencia_dias=plano.duracao_dias,
            external_reference=str(assinatura.id),
            card_token_id=data.card_token_id,
            payer_first_name=data.payer_first_name,
            payer_last_name=data.payer_last_name,
            cpf=data.cpf,
        )
    except MercadoPagoError as exc:
        if era_nova:
            db.delete(assinatura)
            db.commit()
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    assinatura.mp_subscription_id = preapproval.get("id")
    status_mp = preapproval.get("status")

    if status_mp == "authorized":
        agora = datetime.now(timezone.utc)
        assinatura.status = StatusAssinatura.ativa
        assinatura.data_inicio = agora
        assinatura.data_expiracao = agora + timedelta(days=plano.duracao_dias)
        assinatura.data_proximo_pagamento = assinatura.data_expiracao
        db.commit()
        return CheckoutCartaoOut(assinatura_id=assinatura.id, status="ativa", data_expiracao=assinatura.data_expiracao)

    if status_mp in ("cancelled", "rejected"):
        assinatura.status = StatusAssinatura.cancelada
        db.commit()
        return CheckoutCartaoOut(
            assinatura_id=assinatura.id,
            status="recusada",
            mensagem=mensagem_rejeicao(preapproval.get("status_detail")),
        )

    # "pending" ou outro status intermediário: o webhook (subscription_preapproval)
    # confirma a autorização assim que o Mercado Pago concluir a análise.
    db.commit()
    return CheckoutCartaoOut(
        assinatura_id=assinatura.id,
        status="pendente",
        mensagem="Pagamento em análise. Você será avisado assim que for confirmado.",
    )


@router.post("/checkout/pix", response_model=CheckoutPixOut)
def criar_checkout_pix(
    data: CheckoutPixIn, db: Session = Depends(get_db), cliente: Cliente = Depends(get_current_cliente)
) -> CheckoutPixOut:
    """Checkout embutido com PIX: gera um pagamento avulso (PIX não tem cobrança recorrente
    no Mercado Pago) — o frontend mostra o QR Code e faz polling em /verificar-pagamento até
    aprovar. Cada período dessa assinatura precisa de um novo pagamento (renovação manual)."""
    plano = _plano_ativo_ou_404(db, data.plano_id)

    era_nova = cliente.assinatura is None
    assinatura = preparar_assinatura_para_checkout(db, cliente, plano)

    try:
        payment = criar_pagamento_pix(
            cliente_email=cliente.email,
            plano_nome=plano.nome,
            valor_reais=plano.preco_centavos / 100,
            external_reference=str(assinatura.id),
        )
    except MercadoPagoError as exc:
        if era_nova:
            db.delete(assinatura)
            db.commit()
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    dados_transacao = (payment.get("point_of_interaction") or {}).get("transaction_data") or {}
    return CheckoutPixOut(
        assinatura_id=assinatura.id,
        payment_id=str(payment["id"]),
        qr_code=dados_transacao.get("qr_code"),
        qr_code_base64=dados_transacao.get("qr_code_base64"),
    )


@router.get("/{assinatura_id}/verificar-pagamento", response_model=VerificarPagamentoOut)
def verificar_pagamento(
    assinatura_id: int, db: Session = Depends(get_db), cliente: Cliente = Depends(get_current_cliente)
) -> VerificarPagamentoOut:
    """Polling do frontend enquanto o PIX não é pago — reconsulta a API do Mercado Pago
    diretamente (não depende só do webhook, que pode demorar ou falhar em chegar)."""
    assinatura = (
        db.query(Assinatura).filter(Assinatura.id == assinatura_id, Assinatura.cliente_id == cliente.id).first()
    )
    if assinatura is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Assinatura não encontrada")

    if assinatura.status != StatusAssinatura.ativa:
        try:
            payment = buscar_payment_aprovado_por_referencia(str(assinatura.id))
        except MercadoPagoError as exc:
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
        if payment is not None:
            registrar_pagamento(db, assinatura, payment)
            db.refresh(assinatura)

    return VerificarPagamentoOut(
        status="aprovado" if assinatura.status == StatusAssinatura.ativa else "pendente",
        ativa=assinatura.status == StatusAssinatura.ativa,
        data_expiracao=assinatura.data_expiracao,
    )
