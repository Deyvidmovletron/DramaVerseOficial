from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


def import_all_models() -> None:
    """Garante que todos os models sejam registrados no metadata do Base (usado pelo Alembic)."""
    from app.models import (  # noqa: F401
        admin,
        assinatura,
        categoria,
        cliente,
        episodio,
        importacao_playlist,
        minha_lista,
        pagamento,
        plano,
        progresso,
        serie,
        temporada,
    )
