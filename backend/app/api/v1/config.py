from fastapi import APIRouter
from pydantic import BaseModel

from app.core.config import settings

router = APIRouter(prefix="/config", tags=["config"])


class ConfigPublica(BaseModel):
    # Chave PÚBLICA do Mercado Pago — é exposta no navegador de qualquer forma (o SDK
    # do MP a usa client-side). Servida em runtime pra o frontend não precisar dela
    # embutida no bundle em tempo de build: assim ela é configurada só no
    # backend-stack.yml (MERCADOPAGO_PUBLIC_KEY), junto com o access token.
    mercadopago_public_key: str


@router.get("", response_model=ConfigPublica)
def obter_config_publica() -> ConfigPublica:
    return ConfigPublica(mercadopago_public_key=settings.mercadopago_public_key)
