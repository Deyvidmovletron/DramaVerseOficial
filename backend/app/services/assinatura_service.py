from datetime import datetime, timedelta, timezone

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.assinatura import Assinatura, StatusAssinatura
from app.models.cliente import Cliente
from app.models.pagamento import Pagamento, StatusPagamento
from app.models.plano import Plano


def registrar_pagamento(db: Session, assinatura: Assinatura, payment: dict) -> Pagamento | None:
    """Registra o resultado de um `payment` do Mercado Pago pra uma assinatura — idempotente
    por `mp_payment_id` (retorna None se essa notificação já tinha sido processada, seja pelo
    webhook ou pelo polling do PIX, o que chegar primeiro). Se aprovado, ativa a assinatura e
    estende a validade a partir do maior entre "agora" e a expiração atual (renovação
    antecipada não perde os dias que ainda restavam)."""
    payment_id = str(payment["id"])
    if db.query(Pagamento).filter(Pagamento.mp_payment_id == payment_id).first() is not None:
        return None

    pagamento_status = payment.get("status")
    novo_pagamento = Pagamento(
        assinatura_id=assinatura.id,
        mp_payment_id=payment_id,
        valor_centavos=round(float(payment.get("transaction_amount") or 0) * 100),
        status=StatusPagamento.aprovado if pagamento_status == "approved" else StatusPagamento.rejeitado,
    )
    db.add(novo_pagamento)

    if pagamento_status == "approved":
        agora = datetime.now(timezone.utc)
        # SQLite não preserva timezone: data_expiracao volta "naive" do banco.
        expiracao_atual = assinatura.data_expiracao
        if expiracao_atual is not None and expiracao_atual.tzinfo is None:
            expiracao_atual = expiracao_atual.replace(tzinfo=timezone.utc)
        base = expiracao_atual if expiracao_atual and expiracao_atual > agora else agora
        assinatura.status = StatusAssinatura.ativa
        if assinatura.data_inicio is None:
            assinatura.data_inicio = agora
        assinatura.data_expiracao = base + timedelta(days=assinatura.plano.duracao_dias)
        assinatura.data_proximo_pagamento = assinatura.data_expiracao

    try:
        db.commit()
    except IntegrityError:
        # Corrida entre duas entregas concorrentes da mesma notificação (webhook + polling
        # do PIX, ou dois retries do webhook): a checagem acima não pegou porque as duas
        # passaram antes de qualquer uma commitar. A constraint única em mp_payment_id barra
        # a segunda no banco — trata como a duplicata que ela é, em vez de propagar o erro.
        db.rollback()
        return None

    db.refresh(novo_pagamento)
    return novo_pagamento


def assinatura_vigente(cliente: Cliente) -> Assinatura | None:
    """Retorna a assinatura do cliente se ela estiver ativa e não expirada."""
    assinatura = cliente.assinatura
    if assinatura is None or assinatura.status != StatusAssinatura.ativa:
        return None

    expiracao = assinatura.data_expiracao
    if expiracao is None:
        return assinatura
    # SQLite não preserva timezone: data_expiracao volta "naive" do banco.
    if expiracao.tzinfo is None:
        expiracao = expiracao.replace(tzinfo=timezone.utc)
    return assinatura if expiracao > datetime.now(timezone.utc) else None


def cliente_tem_acesso(cliente: Cliente) -> bool:
    return cliente.status.value == "ativo" and assinatura_vigente(cliente) is not None


def atribuir_plano_ativo(db: Session, cliente: Cliente, plano: Plano) -> Assinatura:
    """Ativa `plano` pro cliente imediatamente (usado pelo admin — atribuição manual, sem
    passar pelo Mercado Pago). Cada cliente tem no máximo uma assinatura (constraint única
    em cliente_id): atualiza a existente em vez de criar outra."""
    agora = datetime.now(timezone.utc)
    assinatura = cliente.assinatura
    if assinatura is None:
        assinatura = Assinatura(cliente_id=cliente.id)
        db.add(assinatura)

    assinatura.plano_id = plano.id
    assinatura.status = StatusAssinatura.ativa
    assinatura.data_inicio = agora
    assinatura.data_expiracao = agora + timedelta(days=plano.duracao_dias)
    db.commit()
    db.refresh(assinatura)
    return assinatura


def preparar_assinatura_para_checkout(db: Session, cliente: Cliente, plano: Plano) -> Assinatura:
    """Prepara a assinatura do cliente pra um novo checkout (cartão/PIX/redirect) —
    reaproveita a existente em vez de criar outra. Se ela ainda está vigente (paga, não
    vencida), não mexe em status/datas até o novo pagamento ser confirmado — só troca o
    plano_id — pra não cortar o acesso do cliente no meio de uma troca de plano."""
    assinatura = cliente.assinatura
    if assinatura is None:
        assinatura = Assinatura(cliente_id=cliente.id, plano_id=plano.id, status=StatusAssinatura.pendente)
        db.add(assinatura)
    else:
        ainda_vigente = assinatura_vigente(cliente) is not None
        assinatura.plano_id = plano.id
        if not ainda_vigente:
            assinatura.status = StatusAssinatura.pendente
    db.commit()
    db.refresh(assinatura)
    return assinatura
