import uuid
from pathlib import Path
from typing import TypedDict

import yt_dlp


class YoutubeVideoInfo(TypedDict):
    video_id: str
    titulo: str
    descricao: str | None
    thumbnail_url: str | None
    duracao_segundos: int | None


class YoutubeError(Exception):
    pass


def _base_opts() -> dict:
    return {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "noplaylist": True,
    }


def fetch_video_info(url: str) -> YoutubeVideoInfo:
    """Busca metadados de um único vídeo do YouTube (sem baixar), via yt-dlp."""
    try:
        with yt_dlp.YoutubeDL(_base_opts()) as ydl:
            info = ydl.extract_info(url, download=False)
    except yt_dlp.utils.DownloadError as exc:
        raise YoutubeError(f"Não foi possível obter informações do vídeo: {exc}") from exc

    if info is None or "id" not in info:
        raise YoutubeError("Vídeo do YouTube não encontrado ou indisponível.")

    return YoutubeVideoInfo(
        video_id=info["id"],
        titulo=info.get("title") or "Sem título",
        descricao=info.get("description"),
        thumbnail_url=info.get("thumbnail"),
        duracao_segundos=info.get("duration"),
    )


class YoutubePlaylistInfo(TypedDict):
    titulo: str | None
    thumbnail_url: str | None
    entradas: list[YoutubeVideoInfo]


def fetch_playlist_info(url: str) -> YoutubePlaylistInfo:
    """Lista os vídeos de uma playlist do YouTube (extração 'flat', sem baixar nada),
    preservando a ordem original, junto com os metadados da própria playlist (título e
    thumbnail) — usados como capa/banner padrão da série."""
    opts = {**_base_opts(), "noplaylist": False, "extract_flat": "in_playlist"}

    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=False)
    except yt_dlp.utils.DownloadError as exc:
        raise YoutubeError(f"Não foi possível obter a playlist: {exc}") from exc

    info = info or {}
    entries = info.get("entries")
    if not entries:
        raise YoutubeError("Playlist vazia, privada ou não encontrada.")

    resultado: list[YoutubeVideoInfo] = []
    for entry in entries:
        if not entry or not entry.get("id"):
            continue
        video_id = entry["id"]
        resultado.append(
            YoutubeVideoInfo(
                video_id=video_id,
                titulo=entry.get("title") or "Sem título",
                descricao=entry.get("description"),
                # A extração "flat" da playlist só traz thumbnails pequenas e recortadas
                # (a lista `thumbnails`/`thumbnail` do yt-dlp aqui vem com params de crop,
                # no máx. ~336x188) — construímos a URL canônica direto pelo video_id, que
                # serve a imagem original em qualidade real (download_thumbnail cuida de
                # tentar a versão em alta resolução na hora de baixar).
                thumbnail_url=f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg",
                duracao_segundos=entry.get("duration"),
            )
        )

    if not resultado:
        raise YoutubeError("Nenhum vídeo válido encontrado nessa playlist.")

    return YoutubePlaylistInfo(
        titulo=info.get("title"),
        # A playlist normalmente usa a thumbnail do primeiro vídeo como capa.
        thumbnail_url=resultado[0]["thumbnail_url"],
        entradas=resultado,
    )


def download_video(video_id: str, dest_dir: Path) -> str:
    """Baixa um vídeo do YouTube para dest_dir e retorna o caminho relativo a media_root
    (ex: 'videos/<uuid>.mp4'), para ser salvo em Episodio.arquivo_local_path."""
    dest_dir.mkdir(parents=True, exist_ok=True)
    stem = uuid.uuid4().hex
    outtmpl = str(dest_dir / f"{stem}.%(ext)s")

    opts = {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "format": "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/best",
        "merge_output_format": "mp4",
        "outtmpl": outtmpl,
    }

    url = f"https://www.youtube.com/watch?v={video_id}"
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            ydl.extract_info(url, download=True)
    except yt_dlp.utils.DownloadError as exc:
        raise YoutubeError(f"Falha ao baixar o vídeo: {exc}") from exc

    candidatos = list(dest_dir.glob(f"{stem}.*"))
    if not candidatos:
        raise YoutubeError("O download terminou mas o arquivo não foi encontrado.")

    return f"videos/{candidatos[0].name}"
