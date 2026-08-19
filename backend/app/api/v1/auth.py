from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, get_current_cliente, get_db
from app.core.config import settings
from app.core.rate_limit import checar_rate_limit_login, limpar_tentativas_login, registrar_falha_login
from app.core.security import (
    InvalidTokenError,
    create_access_token,
    create_refresh_token,
    create_reset_password_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.admin import Admin
from app.models.cliente import Cliente
from app.schemas.admin import AdminOut
from app.schemas.auth import AtualizarPerfilIn, EsqueciSenhaIn, LoginIn, RedefinirSenhaIn, TokenOut, TrocarSenhaIn
from app.schemas.cliente import AssinaturaResumoOut, ClienteMeOut
from app.services.assinatura_service import assinatura_vigente
from app.services.email_service import enviar_email

router = APIRouter(prefix="/auth", tags=["auth"])

_MENSAGEM_ESQUECI_SENHA = "Se esse e-mail estiver cadastrado, enviamos um link de redefinição de senha."
_REFRESH_COOKIE_PATH = "/api/v1/auth"


def _refresh_cookie_name(scope: str) -> str:
    return f"refresh_token_{scope}"


def _set_refresh_cookie(response: Response, scope: str, token: str) -> None:
    response.set_cookie(
        key=_refresh_cookie_name(scope),
        value=token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path=_REFRESH_COOKIE_PATH,
        max_age=settings.refresh_token_expire_days * 86400,
    )


def _clear_refresh_cookie(response: Response, scope: str) -> None:
    response.delete_cookie(key=_refresh_cookie_name(scope), path=_REFRESH_COOKIE_PATH)


def _tokens_for(response: Response, user: Admin | Cliente, user_type: str) -> TokenOut:
    _set_refresh_cookie(response, user_type, create_refresh_token(user.id, user_type, user.token_version))
    return TokenOut(access_token=create_access_token(user.id, user_type, user.token_version))


def _refresh_tokens(
    request: Request, response: Response, db: Session, model: type[Admin] | type[Cliente], expected_type: str
) -> TokenOut:
    refresh_token = request.cookies.get(_refresh_cookie_name(expected_type))
    if not refresh_token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Sessão não encontrada, faça login novamente")

    try:
        payload = decode_token(refresh_token)
    except InvalidTokenError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Sessão inválida ou expirada") from exc

    if payload.get("token_type") != "refresh" or payload.get("type") != expected_type:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Sessão inválida")

    user = db.get(model, int(payload["sub"]))
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Usuário não encontrado")
    if payload.get("tv", 0) != user.token_version:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Sessão expirada, faça login novamente")

    return _tokens_for(response, user, expected_type)


def _esqueci_senha(db: Session, model: type[Admin] | type[Cliente], user_type: str, email: str, link_path: str) -> None:
    user = db.query(model).filter(model.email == email).first()
    if user is not None:
        token = create_reset_password_token(user.id, user_type, user.token_version)
        link = f"{settings.frontend_url}{link_path}?token={token}"
        enviar_email(
            user.email,
            "Redefinição de senha",
            f"Olá, {user.nome}!\n\nUse o link abaixo para redefinir sua senha (válido por um tempo limitado):\n{link}\n\nSe você não pediu isso, ignore este e-mail.",
        )
    # Sempre a mesma resposta, tenha o e-mail sido encontrado ou não — evita que alguém
    # descubra quais e-mails estão cadastrados testando o formulário.


def _redefinir_senha(db: Session, model: type[Admin] | type[Cliente], user_type: str, data: RedefinirSenhaIn) -> None:
    try:
        payload = decode_token(data.token)
    except InvalidTokenError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Link de redefinição inválido ou expirado") from exc

    if payload.get("token_type") != "reset_senha" or payload.get("type") != user_type:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Link de redefinição inválido")

    user = db.get(model, int(payload["sub"]))
    if user is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Link de redefinição inválido")
    if payload.get("tv", 0) != user.token_version:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Esse link já foi usado. Solicite um novo.")

    user.senha_hash = hash_password(data.nova_senha)
    user.token_version += 1  # invalida o link usado e todas as sessões abertas
    db.commit()


# --- Cliente ---------------------------------------------------------------


@router.post("/cliente/login", response_model=TokenOut)
def login_cliente(data: LoginIn, request: Request, response: Response, db: Session = Depends(get_db)) -> TokenOut:
    checar_rate_limit_login(request, data.email)

    cliente = db.query(Cliente).filter(Cliente.email == data.email).first()
    if cliente is None or not verify_password(data.senha, cliente.senha_hash):
        registrar_falha_login(request, data.email)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="E-mail ou senha inválidos")

    limpar_tentativas_login(request, data.email)
    return _tokens_for(response, cliente, "cliente")


@router.post("/cliente/refresh", response_model=TokenOut)
def refresh_cliente(request: Request, response: Response, db: Session = Depends(get_db)) -> TokenOut:
    return _refresh_tokens(request, response, db, Cliente, "cliente")


@router.post("/cliente/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout_cliente(
    response: Response, cliente: Cliente = Depends(get_current_cliente), db: Session = Depends(get_db)
) -> None:
    cliente.token_version += 1
    db.commit()
    _clear_refresh_cookie(response, "cliente")


@router.post("/cliente/esqueci-senha", status_code=status.HTTP_202_ACCEPTED)
def esqueci_senha_cliente(data: EsqueciSenhaIn, db: Session = Depends(get_db)) -> dict:
    _esqueci_senha(db, Cliente, "cliente", data.email, "/redefinir-senha")
    return {"detail": _MENSAGEM_ESQUECI_SENHA}


@router.post("/cliente/redefinir-senha", status_code=status.HTTP_204_NO_CONTENT)
def redefinir_senha_cliente(data: RedefinirSenhaIn, db: Session = Depends(get_db)) -> None:
    _redefinir_senha(db, Cliente, "cliente", data)


@router.put("/cliente/perfil", response_model=ClienteMeOut)
def atualizar_perfil_cliente(
    data: AtualizarPerfilIn, cliente: Cliente = Depends(get_current_cliente), db: Session = Depends(get_db)
) -> ClienteMeOut:
    cliente.nome = data.nome
    cliente.email = data.email
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Já existe uma conta com esse e-mail") from exc
    db.refresh(cliente)
    return me_cliente(cliente)


@router.post("/cliente/trocar-senha", response_model=TokenOut)
def trocar_senha_cliente(
    data: TrocarSenhaIn,
    response: Response,
    cliente: Cliente = Depends(get_current_cliente),
    db: Session = Depends(get_db),
) -> TokenOut:
    if not verify_password(data.senha_atual, cliente.senha_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Senha atual incorreta")

    cliente.senha_hash = hash_password(data.nova_senha)
    cliente.token_version += 1  # derruba outras sessões; a atual é reemitida abaixo
    db.commit()
    return _tokens_for(response, cliente, "cliente")


@router.post("/cliente/logout-todos", status_code=status.HTTP_204_NO_CONTENT)
def logout_todos_cliente(
    response: Response, cliente: Cliente = Depends(get_current_cliente), db: Session = Depends(get_db)
) -> None:
    cliente.token_version += 1
    db.commit()
    _clear_refresh_cookie(response, "cliente")


@router.get("/cliente/me", response_model=ClienteMeOut)
def me_cliente(cliente: Cliente = Depends(get_current_cliente)) -> ClienteMeOut:
    assinatura = assinatura_vigente(cliente)
    return ClienteMeOut(
        id=cliente.id,
        nome=cliente.nome,
        email=cliente.email,
        status=cliente.status,
        criado_em=cliente.criado_em,
        assinatura=AssinaturaResumoOut(
            ativa=assinatura is not None,
            status=assinatura.status.value if assinatura else None,
            data_expiracao=assinatura.data_expiracao if assinatura else None,
        ),
    )


# --- Admin -------------------------------------------------------------------


@router.post("/admin/login", response_model=TokenOut)
def login_admin(data: LoginIn, request: Request, response: Response, db: Session = Depends(get_db)) -> TokenOut:
    checar_rate_limit_login(request, data.email)

    admin = db.query(Admin).filter(Admin.email == data.email).first()
    if admin is None or not verify_password(data.senha, admin.senha_hash):
        registrar_falha_login(request, data.email)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="E-mail ou senha inválidos")

    limpar_tentativas_login(request, data.email)
    return _tokens_for(response, admin, "admin")


@router.post("/admin/refresh", response_model=TokenOut)
def refresh_admin(request: Request, response: Response, db: Session = Depends(get_db)) -> TokenOut:
    return _refresh_tokens(request, response, db, Admin, "admin")


@router.post("/admin/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout_admin(response: Response, admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)) -> None:
    admin.token_version += 1
    db.commit()
    _clear_refresh_cookie(response, "admin")


@router.post("/admin/esqueci-senha", status_code=status.HTTP_202_ACCEPTED)
def esqueci_senha_admin(data: EsqueciSenhaIn, db: Session = Depends(get_db)) -> dict:
    _esqueci_senha(db, Admin, "admin", data.email, "/admin/redefinir-senha")
    return {"detail": _MENSAGEM_ESQUECI_SENHA}


@router.post("/admin/redefinir-senha", status_code=status.HTTP_204_NO_CONTENT)
def redefinir_senha_admin(data: RedefinirSenhaIn, db: Session = Depends(get_db)) -> None:
    _redefinir_senha(db, Admin, "admin", data)


@router.get("/admin/me", response_model=AdminOut)
def me_admin(admin: Admin = Depends(get_current_admin)) -> Admin:
    return admin
