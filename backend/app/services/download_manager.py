import logging

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.episodio import Episodio, FonteEpisodio, StatusProcessamento
from app.services.media_storage import delete_video_file
from app.services.youtube_service import YoutubeError, download_video

logger = logging.getLogger(__name__)


def executar_download(episodio_id: int) -> None:
    """Executado em background (fora do ciclo de vida da requisição) — precisa da sua
    própria sessão de banco, já que a sessão da requisição original já foi fechada."""
    db = SessionLocal()
    try:
        episodio = db.get(Episodio, episodio_id)
        if episodio is None or not episodio.youtube_video_id:
            return

        # Em caso de retry, remove o arquivo de uma tentativa anterior antes de baixar de novo.
        if episodio.arquivo_local_path:
            delete_video_file(episodio.arquivo_local_path)
            episodio.arquivo_local_path = None

        episodio.status_processamento = StatusProcessamento.baixando
        db.commit()

        try:
            caminho_relativo = download_video(episodio.youtube_video_id, settings.media_root_path / "videos")
        except YoutubeError:
            episodio.status_processamento = StatusProcessamento.erro
            db.commit()
            return
        except Exception:
            # Qualquer falha não prevista (disco cheio, erro do ffmpeg, etc.) não pode deixar
            # o episódio preso em "baixando" para sempre — sem isso, só dava pra destravar
            # editando o banco direto, já que o endpoint de retry rejeita status "baixando".
            logger.exception("Falha inesperada ao baixar o episódio %s", episodio_id)
            episodio.status_processamento = StatusProcessamento.erro
            db.commit()
            return

        episodio.arquivo_local_path = caminho_relativo
        episodio.fonte = FonteEpisodio.youtube_baixado
        episodio.status_processamento = StatusProcessamento.pronto
        db.commit()
    finally:
        db.close()
