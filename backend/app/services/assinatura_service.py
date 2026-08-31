from datetime import datetime, timedelta, timezone

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.assinatura import Assinatura, StatusAssinatura
from app.models.cliente import Cliente
from app.models.pagamento import Pagamento, StatusPagamento
from app.models.plano import Plano


DIAS_CICLO_RECORRENTE = 30  # cartão = cobrança MENSAL no Mercado Pago (frequency 1 month)


def _status_pagamento(mp_status: str | None) -> StatusPagamento:
    if mp_status == "approved":
        return StatusPagamento.aprovado
    if mp_status in ("rejected", "cancelled"):
        return StatusPagamento.rejeitado
    if mp_status in ("refunded", "charged_back"):
        return StatusPagamento.estornado
    return StatusPagamento.pendente  # pending, in_process, authorized...


def registrar_pagamento(db: Session, assinatura: Assinatura, payment: dict) -> Pagamento | None:
    """Registra/atualiza o resultado de um `payment` do Mercado Pago pra uma assinatura.

    Idempotente: um pagamento que já está `aprovado` no banco não é reprocessado (retorna
    None). Um pagamento antes `pendente` (ex: PIX aguardando, ou 1º webhook chegou com o
    pagamento ainda em processamento) é ATUALIZADO quando o Mercado Pago confirma a
    aprovação — assim a assinatura ativa mesmo que a 1ª notificação não tenha vindo
    aprovada.

    Ao aprovar, define a nova validade:
    - **primeiro pagamento** da assinatura: período conta a partir de agora (ignora a
      expiração provisória do checkout ou os dias restantes de um teste grátis — senão o
      cliente ganharia mês dobrado no 1º ciclo);
    - **renovação**: estende a partir do maior entre "agora" e a expiração atual, pra uma
      renovação antecipada (ex: PIX) não perder os dias que ainda restavam.

    Duração do ciclo: 30 dias quando é assinatura recorrente de cartão (cobrança mensal no
    MP); `plano.duracao_dias` quando é pagamento avulso (PIX)."""
    payment_id = str(payment["id"])
    status_pag = _status_pagamento(payment.get("status"))
    aprovado = status_pag == StatusPagamento.aprovado
    valor_centavos = round(float(payment.get("transaction_amount") or 0) * 100)

    existente = db.query(Pagamento).filter(Pagamento.mp_payment_id == payment_id).first()
    if existente is not None:
        if existente.status == StatusPagamento.aprovado or not aprovado:
            # Já processado com sucesso, ou continua não-aprovado — nada a fazer.
            return None
        existente.status = StatusPagamento.aprovado
        existente.valor_centavos = valor_centavos
        pagamento = existente
    else:
        pagamento = Pagamento(
            assinatura_id=assinatura.id,
            mp_payment_id=payment_id,
            valor_centavos=valor_centavos,
            status=status_pag,
        )
        db.add(pagamento)

    if aprovado:
        agora = datetime.now(timezone.utc)
        ja_teve_pagamento_aprovado = (
            db.query(Pagamento)
            .filter(
                Pagamento.assinatura_id == assinatura.id,
                Pagamento.status == StatusPagamento.aprovado,
                Pagamento.mp_payment_id != payment_id,
            )
            .first()
            is not None
        )

        # SQLite não preserva timezone: data_expiracao volta "naive" do banco.
        expiracao_atual = assinatura.data_expiracao
        if expiracao_atual is not None and expiracao_atual.tzinfo is None:
            expiracao_atual = expiracao_atual.replace(tzinfo=timezone.utc)

        if ja_teve_pagamento_aprovado and expiracao_atual and expiracao_atual > agora:
            base = expiracao_atual
        else:
            base = agora

        recorrente = assinatura.mp_subscription_id is not None
        dias = DIAS_CICLO_RECORRENTE if recorrente else assinatura.plano.duracao_dias

        assinatura.status = StatusAssinatura.ativa
        if assinatura.data_inicio is None:
            assinatura.data_inicio = agora
        assinatura.data_expiracao = base + timedelta(days=dias)
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

    db.refresh(pagamento)
    return pagamento


_STATUS_COM_ACESSO = (StatusAssinatura.ativa, StatusAssinatura.teste)


def assinatura_vigente(cliente: Cliente) -> Assinatura | None:
    """Retorna a assinatura do cliente se ela estiver vigente e não expirada — vale tanto
    para assinatura paga (`ativa`) quanto para período de teste grátis (`teste`)."""
    assinatura = cliente.assinatura
    if assinatura is None or assinatura.status not in _STATUS_COM_ACESSO:
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


def iniciar_teste_gratis(db: Session, cliente: Cliente, plano: Plano) -> Assinatura:
    """Inicia o período de teste grátis do `plano` pro cliente — SEM cartão e SEM
    Mercado Pago. Acesso liberado na hora; ao fim do teste o scheduler marca a
    assinatura como 'atrasada' e o cliente precisa pagar (cartão recorrente ou PIX).
    Só para conta nova: o endpoint garante que o cliente ainda não tem assinatura."""
    agora = datetime.now(timezone.utc)
    assinatura = Assinatura(
        cliente_id=cliente.id,
        plano_id=plano.id,
        status=StatusAssinatura.teste,
        data_inicio=agora,
        data_expiracao=agora + timedelta(days=plano.periodo_teste_dias),
    )
    assinatura.data_proximo_pagamento = assinatura.data_expiracao
    db.add(assinatura)
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
