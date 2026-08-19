from app.models.serie import Serie


def preencher_capa_padrao(serie: Serie, thumbnail_url: str | None) -> None:
    """Se a série ainda não tem capa/banner, usa a primeira thumbnail de episódio disponível
    como capa provisória — só a partir de imagens já hospedadas localmente (evita depender de
    hotlink externo como capa oficial da série). O admin pode trocar a qualquer momento."""
    if not thumbnail_url or not thumbnail_url.startswith("/media/"):
        return
    if serie.capa_url is None:
        serie.capa_url = thumbnail_url
    if serie.banner_url is None:
        serie.banner_url = thumbnail_url
