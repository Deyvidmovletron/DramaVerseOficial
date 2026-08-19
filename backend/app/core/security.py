from datetime import datetime, timedelta, timezone
from typing import Literal

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings

TokenType = Literal["access", "refresh", "reset_senha"]
UserType = Literal["admin", "cliente"]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def _create_token(
    subject: int, user_type: UserType, token_type: TokenType, expires_delta: timedelta, token_version: int
) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(subject),
        "type": user_type,
        "token_type": token_type,
        "tv": token_version,
        "iat": now,
        "exp": now + expires_delta,
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def create_access_token(subject: int, user_type: UserType, token_version: int) -> str:
    return _create_token(
        subject, user_type, "access", timedelta(minutes=settings.access_token_expire_minutes), token_version
    )


def create_refresh_token(subject: int, user_type: UserType, token_version: int) -> str:
    return _create_token(
        subject, user_type, "refresh", timedelta(days=settings.refresh_token_expire_days), token_version
    )


def create_reset_password_token(subject: int, user_type: UserType, token_version: int) -> str:
    """Token assinado de vida curta para o fluxo de redefinição de senha. Carrega o
    token_version atual do usuário para que, uma vez usado (o que também incrementa o
    token_version), o mesmo link de reset não possa ser reaproveitado."""
    return _create_token(
        subject,
        user_type,
        "reset_senha",
        timedelta(minutes=settings.reset_password_token_expire_minutes),
        token_version,
    )


class InvalidTokenError(Exception):
    pass


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError as exc:
        raise InvalidTokenError(str(exc)) from exc
