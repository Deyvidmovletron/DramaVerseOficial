import subprocess
import uuid
from pathlib import Path

import httpx
from fastapi import UploadFile

from app.core.config import settings

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024  # 8MB
MAX_VIDEO_SIZE_BYTES = 5 * 1024 * 1024 * 1024  # 5GB
THUMBNAIL_EXT_POR_CONTENT_TYPE = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}


class MediaValidationError(Exception):
    pass


def _write_upload(upload: UploadFile, dest_path: Path, max_size: int) -> None:
    size = 0
    try:
        with dest_path.open("wb") as f:
            while chunk := upload.file.read(1024 * 1024):
                size += len(chunk)
                if size > max_size:
                    raise MediaValidationError(f"Arquivo muito grande (máximo de {max_size // (1024 * 1024)}MB).")
                f.write(chunk)
    except MediaValidationError:
        dest_path.unlink(missing_ok=True)
        raise


def save_image(upload: UploadFile, subdir: str) -> str:
    """Salva uma imagem pública (capa/banner) e retorna a URL servida via /media/{subdir}/..."""
    if upload.content_type not in ALLOWED_IMAGE_TYPES:
        raise MediaValidationError("Tipo de arquivo não suportado. Use JPEG, PNG ou WEBP.")

    ext = Path(upload.filename or "").suffix.lower() or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    dest_dir = settings.media_root_path / subdir
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_path = dest_dir / filename

    _write_upload(upload, dest_path, MAX_IMAGE_SIZE_BYTES)

    return f"/media/{subdir}/{filename}"


def save_video(upload: UploadFile) -> str:
    """Salva um vídeo local (fora de qualquer mount público) e retorna o caminho relativo
    a media_root, para ser armazenado em Episodio.arquivo_local_path."""
    content_type = upload.content_type or ""
    if not content_type.startswith("video/"):
        raise MediaValidationError("Tipo de arquivo não suportado. Envie um arquivo de vídeo.")

    ext = Path(upload.filename or "").suffix.lower() or ".mp4"
    filename = f"{uuid.uuid4().hex}{ext}"
    dest_dir = settings.media_root_path / "videos"
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_path = dest_dir / filename

    _write_upload(upload, dest_path, MAX_VIDEO_SIZE_BYTES)

    return f"videos/{filename}"


def download_thumbnail(url: str | None) -> str | None:
    """Baixa uma imagem de capa externa (ex: thumbnail do YouTube) e salva localmente,
    para não depender de hotlink em um CDN de terceiros. Retorna None em qualquer falha
    (a chamada não deve interromper a criação do episódio por causa disso)."""
    if not url:
        return None

    try:
        resp = httpx.get(url, timeout=10, follow_redirects=True)
        resp.raise_for_status()
    except httpx.HTTPError:
        return None

    ext = THUMBNAIL_EXT_POR_CONTENT_TYPE.get(resp.headers.get("content-type", "").split(";")[0].strip(), ".jpg")
    filename = f"{uuid.uuid4().hex}{ext}"
    dest_dir = settings.media_root_path / "thumbnails"
    dest_dir.mkdir(parents=True, exist_ok=True)
    (dest_dir / filename).write_bytes(resp.content)

    return f"/media/thumbnails/{filename}"


def download_youtube_thumbnail(video_id: str) -> str | None:
    """Baixa a melhor thumbnail disponível pra esse vídeo do YouTube: tenta a versão em
    alta resolução (maxresdefault, até 1280x720) e cai pra hqdefault (480x360, sempre
    disponível) quando o vídeo não tem thumbnail em HD."""
    for qualidade in ("maxresdefault", "hqdefault"):
        resultado = download_thumbnail(f"https://i.ytimg.com/vi/{video_id}/{qualidade}.jpg")
        if resultado:
            return resultado
    return None


def generate_video_thumbnail(video_path: Path) -> str | None:
    """Extrai um frame de um vídeo local (via ffmpeg) para usar como thumbnail do episódio.
    Retorna None em qualquer falha — episódio local sem thumbnail não é um erro fatal."""
    filename = f"{uuid.uuid4().hex}.jpg"
    dest_dir = settings.media_root_path / "thumbnails"
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_path = dest_dir / filename

    for instante in ("00:00:03", "00:00:00"):
        try:
            subprocess.run(
                [
                    "ffmpeg", "-y", "-ss", instante, "-i", str(video_path),
                    "-frames:v", "1", "-q:v", "3", str(dest_path),
                ],
                check=True,
                capture_output=True,
                timeout=30,
            )
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired, FileNotFoundError):
            continue
        if dest_path.is_file() and dest_path.stat().st_size > 0:
            return f"/media/thumbnails/{filename}"

    return None


def resolve_video_path(relative_path: str) -> Path:
    return settings.media_root_path / relative_path


def delete_media_file(url: str | None) -> None:
    """Remove uma imagem pública a partir da sua URL (/media/{subdir}/arquivo)."""
    if not url or not url.startswith("/media/"):
        return
    relative = url.removeprefix("/media/")
    path = settings.media_root_path / relative
    if path.is_file():
        path.unlink(missing_ok=True)


def delete_video_file(relative_path: str | None) -> None:
    if not relative_path:
        return
    path = settings.media_root_path / relative_path
    if path.is_file():
        path.unlink(missing_ok=True)
