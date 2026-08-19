import mimetypes
import re
from collections.abc import Iterator
from pathlib import Path

from fastapi import HTTPException, Request, status
from fastapi.responses import StreamingResponse

CHUNK_SIZE = 1024 * 1024  # 1MB
RANGE_RE = re.compile(r"bytes=(\d*)-(\d*)")


def _iter_file(path: Path, start: int, end: int) -> Iterator[bytes]:
    with path.open("rb") as f:
        f.seek(start)
        remaining = end - start + 1
        while remaining > 0:
            chunk = f.read(min(CHUNK_SIZE, remaining))
            if not chunk:
                break
            remaining -= len(chunk)
            yield chunk


def stream_video_file(request: Request, path: Path) -> StreamingResponse:
    if not path.is_file():
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Arquivo de vídeo não encontrado")

    file_size = path.stat().st_size
    media_type = mimetypes.guess_type(path.name)[0] or "video/mp4"
    range_header = request.headers.get("range")

    if range_header:
        match = RANGE_RE.match(range_header)
        if not match:
            raise HTTPException(status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE, detail="Range inválido")

        start_str, end_str = match.groups()
        start = int(start_str) if start_str else 0
        end = int(end_str) if end_str else file_size - 1
        end = min(end, file_size - 1)

        if start > end or start >= file_size:
            raise HTTPException(
                status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE,
                detail="Range inválido",
                headers={"Content-Range": f"bytes */{file_size}"},
            )

        headers = {
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(end - start + 1),
        }
        return StreamingResponse(
            _iter_file(path, start, end), status_code=status.HTTP_206_PARTIAL_CONTENT, media_type=media_type, headers=headers
        )

    headers = {"Accept-Ranges": "bytes", "Content-Length": str(file_size)}
    return StreamingResponse(
        _iter_file(path, 0, file_size - 1), status_code=status.HTTP_200_OK, media_type=media_type, headers=headers
    )
