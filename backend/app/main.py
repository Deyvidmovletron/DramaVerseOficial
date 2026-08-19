import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.core.config import Settings, settings
from app.core.scheduler import iniciar_scheduler, parar_scheduler
from app.db.base import import_all_models
from app.db.bootstrap import ensure_first_admin
from app.db.session import SessionLocal

import_all_models()

logger = logging.getLogger(__name__)


def _checar_credenciais_de_producao() -> None:
    """Os valores padrão de SECRET_KEY/senha do admin inicial só existem pra facilitar o
    setup local — subir com eles em produção é grave o suficiente pra valer recusar boot
    (SECRET_KEY forjaria token de qualquer usuário) ou, no mínimo, gritar bem alto."""
    if settings.environment == "development":
        return

    # Cobre tanto o valor padrão embutido no código quanto o placeholder óbvio que já vem
    # escrito no .env.example — os dois são igualmente inseguros se ninguém trocar. O limite
    # de tamanho pega qualquer outra chave fraca/curta que alguém tenha colocado no lugar.
    valores_inseguros_conhecidos = {
        Settings.model_fields["secret_key"].default,
        "troque-esta-chave-por-uma-chave-secreta-forte",
    }
    if settings.secret_key in valores_inseguros_conhecidos or len(settings.secret_key) < 32:
        raise RuntimeError(
            "SECRET_KEY está com um valor padrão/fraco em um ambiente que não é 'development'. "
            "Gere uma chave própria (ex: `python -c \"import secrets; print(secrets.token_urlsafe(64))\"`) "
            "e defina SECRET_KEY no .env antes de subir em produção — do contrário qualquer pessoa "
            "que conheça esse valor consegue forjar tokens de login."
        )

    padrao_senha_admin = Settings.model_fields["first_admin_password"].default
    if settings.first_admin_password == padrao_senha_admin:
        logger.warning(
            "FIRST_ADMIN_PASSWORD continua com o valor padrão de desenvolvimento. Se o admin "
            "inicial ainda usa essa senha, troque-a agora (login → Esqueci minha senha)."
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    _checar_credenciais_de_producao()
    settings.media_root_path  # garante que o diretório de mídia exista
    db = SessionLocal()
    try:
        ensure_first_admin(db)
    finally:
        db.close()

    iniciar_scheduler()
    yield
    parar_scheduler()


app = FastAPI(
    title="Streaming API",
    description="API da plataforma de streaming (estilo Netflix) com importação de playlists do YouTube e assinaturas via Mercado Pago.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Apenas os subdiretórios de imagens (capas, banners, thumbnails) são expostos publicamente.
# Vídeos ficam em media/videos, fora deste mount, e só são servidos pelo endpoint autenticado
# /api/v1/episodios/{id}/stream (com suporte a range requests).
for _subdir in ("covers", "banners", "thumbnails"):
    _path = settings.media_root_path / _subdir
    _path.mkdir(parents=True, exist_ok=True)
    app.mount(f"/media/{_subdir}", StaticFiles(directory=str(_path)), name=f"media_{_subdir}")

app.include_router(api_router, prefix="/api/v1")


@app.get("/health", tags=["health"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}
