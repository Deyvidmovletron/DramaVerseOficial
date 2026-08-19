from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.models.admin import Admin


def ensure_first_admin(db: Session) -> None:
    """Cria o admin inicial (a partir do .env) se ainda não existir nenhum administrador."""
    if db.query(Admin).first() is not None:
        return

    admin = Admin(
        nome=settings.first_admin_name,
        email=settings.first_admin_email,
        senha_hash=hash_password(settings.first_admin_password),
    )
    db.add(admin)
    db.commit()
