import logging
from datetime import datetime

from apscheduler.schedulers.background import BackgroundScheduler

from app.db.session import SessionLocal
from app.models.assinatura import Assinatura, StatusAssinatura

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler(timezone="UTC")


def verificar_assinaturas_vencidas() -> None:
    """Rede de segurança: marca como 'atrasada' qualquer assinatura ativa cuja data de
    expiração já passou, caso algum webhook do Mercado Pago tenha falhado ou não chegado."""
    db = SessionLocal()
    try:
        agora = datetime.utcnow()
        vencidas = (
            db.query(Assinatura)
            .filter(
                Assinatura.status == StatusAssinatura.ativa,
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


def iniciar_scheduler() -> None:
    if not scheduler.running:
        scheduler.add_job(
            verificar_assinaturas_vencidas,
            "interval",
            hours=24,
            id="verificar_assinaturas_vencidas",
            replace_existing=True,
            next_run_time=datetime.utcnow(),
        )
        scheduler.start()


def parar_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
