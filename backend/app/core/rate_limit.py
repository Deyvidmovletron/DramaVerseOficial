import time
from collections import defaultdict
from threading import Lock

from fastapi import HTTPException, Request, status

JANELA_SEGUNDOS = 15 * 60
MAX_TENTATIVAS = 5

_tentativas: dict[str, list[float]] = defaultdict(list)
_lock = Lock()


def _chave(request: Request, identificador: str) -> str:
    ip = request.client.host if request.client else "desconhecido"
    return f"{ip}:{identificador.strip().lower()}"


def checar_rate_limit_login(request: Request, identificador: str) -> None:
    """Bloqueia tentativas de login além do limite por IP+e-mail numa janela de tempo.
    Guarda o estado em memória do processo — suficiente para o único worker deste stack
    (sem Redis/Celery), mas não é compartilhado entre múltiplos processos/instâncias."""
    chave = _chave(request, identificador)
    agora = time.monotonic()
    with _lock:
        tentativas = [t for t in _tentativas[chave] if agora - t < JANELA_SEGUNDOS]
        _tentativas[chave] = tentativas
        if len(tentativas) >= MAX_TENTATIVAS:
            raise HTTPException(
                status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Muitas tentativas de login. Aguarde alguns minutos e tente novamente.",
            )


def registrar_falha_login(request: Request, identificador: str) -> None:
    chave = _chave(request, identificador)
    with _lock:
        _tentativas[chave].append(time.monotonic())


def limpar_tentativas_login(request: Request, identificador: str) -> None:
    chave = _chave(request, identificador)
    with _lock:
        _tentativas.pop(chave, None)
