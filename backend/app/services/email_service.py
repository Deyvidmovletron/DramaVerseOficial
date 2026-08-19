import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger(__name__)


def enviar_email(destinatario: str, assunto: str, corpo_texto: str) -> None:
    """Envia um e-mail via SMTP quando configurado; caso contrário, apenas loga o conteúdo
    (ambiente sem SMTP configurado — evita quebrar o fluxo de redefinição de senha por
    falta de credenciais). Falhas de envio também não devem derrubar a requisição: o
    reset já foi registrado no banco antes desta chamada."""
    if not settings.smtp_host:
        logger.warning("SMTP não configurado — e-mail para %s não enviado. Conteúdo:\n%s", destinatario, corpo_texto)
        return

    msg = EmailMessage()
    msg["Subject"] = assunto
    msg["From"] = settings.smtp_from or settings.smtp_user or "no-reply@stream-mais.com"
    msg["To"] = destinatario
    msg.set_content(corpo_texto)

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
            if settings.smtp_use_tls:
                smtp.starttls()
            if settings.smtp_user:
                smtp.login(settings.smtp_user, settings.smtp_password)
            smtp.send_message(msg)
    except Exception:
        logger.exception("Falha ao enviar e-mail para %s", destinatario)
