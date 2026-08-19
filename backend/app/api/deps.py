from collections.abc import Generator

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import InvalidTokenError, decode_token
from app.db.session import SessionLocal
from app.models.admin import Admin
from app.models.cliente import Cliente
from app.services.assinatura_service import assinatura_vigente

bearer_scheme = HTTPBearer(auto_error=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _decode_bearer(
    credentials: HTTPAuthorizationCredentials | None, expected_type: str
) -> dict:
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Não autenticado")

    try:
        payload = decode_token(credentials.credentials)
    except InvalidTokenError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Token inválido ou expirado") from exc

    if payload.get("token_type") != "access":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Token inválido: esperado access token")

    if payload.get("type") != expected_type:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Token inválido para este recurso")

    return payload


def _checar_token_version(payload: dict, token_version_atual: int) -> None:
    # Tokens emitidos antes desta coluna existir não carregam "tv" — tratamos como 0,
    # que é o valor inicial de todo mundo, então sessões antigas continuam válidas.
    if payload.get("tv", 0) != token_version_atual:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Sessão expirada, faça login novamente")


def get_current_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Admin:
    payload = _decode_bearer(credentials, "admin")
    admin = db.get(Admin, int(payload["sub"]))
    if admin is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Administrador não encontrado")
    _checar_token_version(payload, admin.token_version)
    return admin


def get_current_cliente(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Cliente:
    payload = _decode_bearer(credentials, "cliente")
    cliente = db.get(Cliente, int(payload["sub"]))
    if cliente is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Cliente não encontrado")
    _checar_token_version(payload, cliente.token_version)
    return cliente


def get_current_cliente_ativo(cliente: Cliente = Depends(get_current_cliente)) -> Cliente:
    if cliente.status.value == "bloqueado":
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Conta bloqueada. Fale com o suporte.")

    if assinatura_vigente(cliente) is None:
        raise HTTPException(
            status.HTTP_402_PAYMENT_REQUIRED,
            detail="Assinatura expirada ou inexistente. Regularize o pagamento para continuar.",
        )

    return cliente


def _resolve_viewer(raw_token: str | None, db: Session) -> Admin | Cliente:
    """Autoriza tanto um admin (acesso irrestrito) quanto um cliente com assinatura
    ativa. Compartilhado pelo streaming de vídeo (get_viewer) e pelas páginas comuns do
    catálogo (get_current_viewer_ativo), para que o login de admin também navegue por
    elas sem precisar de uma conta de cliente."""
    if raw_token is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Não autenticado")

    try:
        payload = decode_token(raw_token)
    except InvalidTokenError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Token inválido ou expirado") from exc

    if payload.get("token_type") != "access":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Token inválido")

    user_type = payload.get("type")

    if user_type == "admin":
        admin = db.get(Admin, int(payload["sub"]))
        if admin is None:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Administrador não encontrado")
        _checar_token_version(payload, admin.token_version)
        return admin

    if user_type == "cliente":
        cliente = db.get(Cliente, int(payload["sub"]))
        if cliente is None:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Cliente não encontrado")
        _checar_token_version(payload, cliente.token_version)
        if cliente.status.value == "bloqueado":
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Conta bloqueada. Fale com o suporte.")
        if assinatura_vigente(cliente) is None:
            raise HTTPException(status.HTTP_402_PAYMENT_REQUIRED, detail="Assinatura expirada ou inexistente.")
        return cliente

    raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Token inválido")


def get_viewer(
    token: str | None = None,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Admin | Cliente:
    """Usado pelo endpoint de streaming de vídeo.

    Aceita o token tanto via header Authorization quanto via query string (?token=...),
    já que a tag <video> nativa do navegador não permite enviar headers customizados —
    o token de acesso tem vida curta e só concede acesso aos mesmos recursos do header."""
    raw_token = credentials.credentials if credentials is not None else token
    return _resolve_viewer(raw_token, db)


def get_current_viewer_ativo(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Admin | Cliente:
    """Usado pelas rotas de catálogo (home, busca, detalhes, player) que agora também
    servem o admin logado, além do cliente com assinatura ativa."""
    raw_token = credentials.credentials if credentials is not None else None
    return _resolve_viewer(raw_token, db)
