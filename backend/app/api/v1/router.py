from fastapi import APIRouter

from app.api.v1 import (
    admin_assinaturas,
    admin_clientes,
    assinaturas,
    auth,
    catalogo,
    categorias,
    dashboard,
    episodios,
    importacao,
    planos,
    series,
    temporadas,
    webhooks,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(categorias.router)
api_router.include_router(series.router)
api_router.include_router(temporadas.router)
api_router.include_router(episodios.router)
api_router.include_router(importacao.router)
api_router.include_router(catalogo.router)
api_router.include_router(planos.router)
api_router.include_router(admin_clientes.router)
api_router.include_router(admin_assinaturas.router)
api_router.include_router(assinaturas.router)
api_router.include_router(webhooks.router)
api_router.include_router(dashboard.router)
