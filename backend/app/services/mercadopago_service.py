import re

import mercadopago

from app.core.config import settings


class MercadoPagoError(Exception):
    pass


def _sdk() -> mercadopago.SDK:
    if not settings.mercadopago_access_token:
        raise MercadoPagoError("Mercado Pago não está configurado (MERCADOPAGO_ACCESS_TOKEN ausente).")
    return mercadopago.SDK(settings.mercadopago_access_token)


def limpar_cpf(cpf: str | None) -> str | None:
    if not cpf:
        return None
    digitos = re.sub(r"\D", "", cpf)
    return digitos or None


def criar_preapproval(
    *,
    cliente_email: str,
    plano_nome: str,
    valor_reais: float,
    frequencia_dias: int,
    external_reference: str,
    card_token_id: str | None = None,
    payer_first_name: str | None = None,
    payer_last_name: str | None = None,
    cpf: str | None = None,
) -> dict:
    """Cria uma assinatura recorrente (preapproval) no Mercado Pago.

    Sem `card_token_id`: fluxo legado — a preapproval nasce "pending" e o retorno traz
    `init_point`, a URL do checkout hospedado pelo Mercado Pago (usuário é redirecionado).

    Com `card_token_id` (cartão tokenizado no frontend via MP.js): a preapproval é
    autorizada na hora, sem redirect — o retorno já vem com `status` definitivo
    ("authorized" ou, em caso de recusa do emissor, outro status)."""
    sdk = _sdk()
    payload: dict = {
        "reason": f"Assinatura {plano_nome}",
        "external_reference": external_reference,
        "payer_email": cliente_email,
        "auto_recurring": {
            "frequency": frequencia_dias,
            "frequency_type": "days",
            "transaction_amount": valor_reais,
            "currency_id": "BRL",
        },
        "back_url": settings.mercadopago_back_url,
    }

    if card_token_id:
        payload["card_token_id"] = card_token_id
        cpf_limpo = limpar_cpf(cpf)
        if cpf_limpo or payer_first_name or payer_last_name:
            payload["payer"] = {
                k: v
                for k, v in {
                    "first_name": payer_first_name,
                    "last_name": payer_last_name,
                    "identification": {"type": "CPF", "number": cpf_limpo} if cpf_limpo else None,
                }.items()
                if v is not None
            }
    else:
        # Sem cartão tokenizado: preapproval fica pendente até o usuário concluir no
        # checkout hospedado (init_point) — não pode ser autorizada de outra forma.
        payload["status"] = "pending"

    resultado = sdk.preapproval().create(payload)
    if resultado.get("status") not in (200, 201):
        raise MercadoPagoError(f"Erro ao criar assinatura no Mercado Pago: {resultado.get('response')}")
    return resultado["response"]


def buscar_preapproval(preapproval_id: str) -> dict:
    sdk = _sdk()
    resultado = sdk.preapproval().get(preapproval_id)
    if resultado.get("status") != 200:
        raise MercadoPagoError(f"Erro ao consultar assinatura no Mercado Pago: {resultado.get('response')}")
    return resultado["response"]


def buscar_payment(payment_id: str) -> dict:
    sdk = _sdk()
    resultado = sdk.payment().get(payment_id)
    if resultado.get("status") != 200:
        raise MercadoPagoError(f"Erro ao consultar pagamento no Mercado Pago: {resultado.get('response')}")
    return resultado["response"]


def buscar_payment_aprovado_por_referencia(external_reference: str) -> dict | None:
    """Busca, entre os pagamentos com essa external_reference, o mais recente aprovado —
    usado no polling do PIX (o frontend não tem o payment_id até o pagamento existir)."""
    sdk = _sdk()
    resultado = sdk.payment().search({"external_reference": external_reference, "sort": "date_created", "criteria": "desc"})
    if resultado.get("status") != 200:
        raise MercadoPagoError(f"Erro ao consultar pagamentos no Mercado Pago: {resultado.get('response')}")
    candidatos = resultado["response"].get("results", [])
    return next((p for p in candidatos if p.get("status") == "approved"), None)


def criar_pagamento_pix(
    *, cliente_email: str, plano_nome: str, valor_reais: float, external_reference: str
) -> dict:
    """Cria um pagamento avulso via PIX — usado pra ativar/renovar uma assinatura por um
    período: sem cobrança automática recorrente (PIX não tem esse conceito no Mercado
    Pago), o cliente paga de novo manualmente quando o período expirar."""
    # Sem notification_url aqui: a URL de webhook é configurada uma vez no painel do
    # Mercado Pago (aplicada a todos os eventos da aplicação) — mesmo padrão já usado
    # pelas preapprovals deste projeto, que também não passam esse campo por request.
    sdk = _sdk()
    payload = {
        "transaction_amount": valor_reais,
        "description": f"Assinatura {plano_nome}",
        "payment_method_id": "pix",
        "payer": {"email": cliente_email},
        "external_reference": external_reference,
    }
    resultado = sdk.payment().create(payload)
    if resultado.get("status") not in (200, 201):
        raise MercadoPagoError(f"Erro ao criar pagamento PIX no Mercado Pago: {resultado.get('response')}")
    return resultado["response"]


# Tradução de payment.status_detail (cartão recusado) pra uma mensagem que faça sentido
# pro cliente ver na tela — o Mercado Pago retorna só o código.
MENSAGENS_REJEICAO: dict[str, str] = {
    "cc_rejected_insufficient_amount": "Saldo insuficiente no cartão.",
    "cc_rejected_bad_filled_card_number": "Número do cartão incorreto.",
    "cc_rejected_bad_filled_date": "Data de vencimento incorreta.",
    "cc_rejected_bad_filled_security_code": "CVV incorreto.",
    "cc_rejected_bad_filled_other": "Dados do cartão incorretos.",
    "cc_rejected_card_disabled": "Cartão desabilitado. Entre em contato com o banco.",
    "cc_rejected_duplicated_payment": "Pagamento duplicado detectado.",
    "cc_rejected_high_risk": "Pagamento não autorizado por segurança.",
    "cc_rejected_max_attempts": "Número máximo de tentativas excedido.",
    "cc_rejected_call_for_authorize": "Autorize o pagamento com o banco e tente novamente.",
    "cc_rejected_invalid_installments": "Número de parcelas inválido para esse cartão.",
    "cc_rejected_other_reason": "O cartão recusou o pagamento. Tente outro cartão.",
}


def mensagem_rejeicao(status_detail: str | None) -> str:
    if status_detail and status_detail in MENSAGENS_REJEICAO:
        return MENSAGENS_REJEICAO[status_detail]
    return "Não foi possível autorizar o pagamento. Tente outro cartão ou método de pagamento."
