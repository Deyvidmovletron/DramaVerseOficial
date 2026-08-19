from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_cliente_ativo, get_current_viewer_ativo, get_db
from app.models.admin import Admin
from app.models.categoria import Categoria
from app.models.cliente import Cliente
from app.models.episodio import Episodio
from app.models.minha_lista import MinhaLista
from app.models.progresso import Progresso
from app.models.serie import Serie, StatusSerie
from app.schemas.categoria import CategoriaOut
from app.schemas.catalogo import (
    CarrosselOut,
    ContinuarAssistindoOut,
    EpisodioCatalogoOut,
    EpisodioPlayerOut,
    HomeOut,
    ProgressoIn,
    ProximoEpisodioOut,
    SerieCardOut,
    SerieDetalheOut,
)

router = APIRouter(prefix="/catalogo", tags=["catalogo"])

MAX_SERIES_POR_CARROSSEL = 30
MAX_CONTINUAR_ASSISTINDO = 20
MAX_DESTAQUES = 6
# Teto defensivo pras queries de catálogo (home/busca) — evita carregar a tabela inteira de
# séries publicadas a cada request conforme o catálogo cresce. Não é paginação de verdade
# (a home ainda quer "todas as séries agrupadas por categoria" pra montar os carrosséis),
# só um limite pra não virar um problema de performance sem querer.
MAX_SERIES_CATALOGO = 300


def _to_card(serie: Serie) -> SerieCardOut:
    return SerieCardOut(
        id=serie.id,
        titulo=serie.titulo,
        sinopse=serie.sinopse,
        capa_url=serie.capa_url,
        banner_url=serie.banner_url,
        ano=serie.ano,
    )


def _series_publicadas(db: Session) -> list[Serie]:
    return (
        db.query(Serie)
        .filter(Serie.status == StatusSerie.publicado)
        .options(selectinload(Serie.categoria))
        .order_by(Serie.criado_em.desc())
        .limit(MAX_SERIES_CATALOGO)
        .all()
    )


def _continuar_assistindo(db: Session, cliente_id: int) -> list[ContinuarAssistindoOut]:
    linhas = (
        db.query(Progresso, Episodio, Serie)
        .join(Episodio, Progresso.episodio_id == Episodio.id)
        .join(Serie, Episodio.serie_id == Serie.id)
        .filter(
            Progresso.cliente_id == cliente_id,
            Progresso.concluido.is_(False),
            Progresso.segundos_assistidos > 0,
            Serie.status == StatusSerie.publicado,
        )
        .order_by(Progresso.atualizado_em.desc())
        .limit(MAX_CONTINUAR_ASSISTINDO)
        .all()
    )
    return [
        ContinuarAssistindoOut(
            episodio_id=ep.id,
            serie_id=serie.id,
            serie_titulo=serie.titulo,
            episodio_titulo=ep.titulo,
            thumbnail_url=ep.thumbnail_url,
            duracao_segundos=ep.duracao_segundos,
            segundos_assistidos=prog.segundos_assistidos,
        )
        for prog, ep, serie in linhas
    ]


@router.get("/home", response_model=HomeOut)
def home(db: Session = Depends(get_db), viewer: Admin | Cliente = Depends(get_current_viewer_ativo)) -> HomeOut:
    series = _series_publicadas(db)

    fonte_destaques = [s for s in series if s.banner_url] or series
    destaques = [_to_card(s) for s in fonte_destaques[:MAX_DESTAQUES]]

    carrosseis: list[CarrosselOut] = []
    if series:
        carrosseis.append(
            CarrosselOut(
                categoria="Adicionados recentemente",
                categoria_id=None,
                series=[_to_card(s) for s in series[:MAX_SERIES_POR_CARROSSEL]],
            )
        )

    por_categoria: dict[int | None, tuple[str, list[Serie]]] = {}
    for serie in series:
        chave = serie.categoria.id if serie.categoria else None
        nome_categoria = serie.categoria.nome if serie.categoria else "Outros"
        if chave not in por_categoria:
            por_categoria[chave] = (nome_categoria, [])
        por_categoria[chave][1].append(serie)

    for categoria_id, (nome_categoria, lista) in por_categoria.items():
        carrosseis.append(
            CarrosselOut(
                categoria=nome_categoria,
                categoria_id=categoria_id,
                series=[_to_card(s) for s in lista[:MAX_SERIES_POR_CARROSSEL]],
            )
        )

    return HomeOut(
        destaques=destaques,
        # Admin não tem histórico de progresso (não é um Cliente) — carrossel vazio pra ele.
        continuar_assistindo=_continuar_assistindo(db, viewer.id) if isinstance(viewer, Cliente) else [],
        carrosseis=carrosseis,
    )


@router.get("/categorias", response_model=list[CategoriaOut])
def listar_categorias_catalogo(
    db: Session = Depends(get_db), _viewer: Admin | Cliente = Depends(get_current_viewer_ativo)
) -> list[Categoria]:
    """Só categorias com pelo menos uma série publicada — evita oferecer filtros que
    sempre voltam vazios pro cliente."""
    return (
        db.query(Categoria)
        .join(Serie, Serie.categoria_id == Categoria.id)
        .filter(Serie.status == StatusSerie.publicado)
        .distinct()
        .order_by(Categoria.nome)
        .all()
    )


@router.get("/busca", response_model=list[SerieCardOut])
def buscar(
    q: str | None = None,
    categoria_id: int | None = None,
    db: Session = Depends(get_db),
    _viewer: Admin | Cliente = Depends(get_current_viewer_ativo),
) -> list[SerieCardOut]:
    if not q and categoria_id is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Informe um termo de busca ou uma categoria")

    query = (
        db.query(Serie)
        .outerjoin(Categoria, Serie.categoria_id == Categoria.id)
        .filter(Serie.status == StatusSerie.publicado)
    )
    if categoria_id is not None:
        query = query.filter(Serie.categoria_id == categoria_id)
    if q:
        termo = f"%{q}%"
        query = query.filter(
            (Serie.titulo.ilike(termo)) | (Serie.sinopse.ilike(termo)) | (Categoria.nome.ilike(termo))
        )

    series = query.order_by(Serie.titulo).limit(MAX_SERIES_CATALOGO).all()
    return [_to_card(s) for s in series]


@router.get("/minha-lista", response_model=list[SerieCardOut])
def listar_minha_lista(
    db: Session = Depends(get_db), viewer: Admin | Cliente = Depends(get_current_viewer_ativo)
) -> list[SerieCardOut]:
    if not isinstance(viewer, Cliente):
        return []  # admin não tem uma lista pessoal

    itens = (
        db.query(MinhaLista)
        .options(selectinload(MinhaLista.serie))
        .filter(MinhaLista.cliente_id == viewer.id)
        .order_by(MinhaLista.criado_em.desc())
        .all()
    )
    return [_to_card(i.serie) for i in itens if i.serie.status == StatusSerie.publicado]


@router.post("/minha-lista/{serie_id}", status_code=status.HTTP_204_NO_CONTENT)
def adicionar_minha_lista(
    serie_id: int, db: Session = Depends(get_db), cliente: Cliente = Depends(get_current_cliente_ativo)
) -> None:
    existe = (
        db.query(MinhaLista).filter(MinhaLista.cliente_id == cliente.id, MinhaLista.serie_id == serie_id).first()
    )
    if existe:
        return

    serie = db.query(Serie).filter(Serie.id == serie_id, Serie.status == StatusSerie.publicado).first()
    if serie is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Série não encontrada")

    db.add(MinhaLista(cliente_id=cliente.id, serie_id=serie_id))
    db.commit()


@router.delete("/minha-lista/{serie_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover_minha_lista(
    serie_id: int, db: Session = Depends(get_db), cliente: Cliente = Depends(get_current_cliente_ativo)
) -> None:
    item = db.query(MinhaLista).filter(MinhaLista.cliente_id == cliente.id, MinhaLista.serie_id == serie_id).first()
    if item:
        db.delete(item)
        db.commit()


@router.get("/series/{serie_id}", response_model=SerieDetalheOut)
def obter_serie(
    serie_id: int, db: Session = Depends(get_db), viewer: Admin | Cliente = Depends(get_current_viewer_ativo)
) -> SerieDetalheOut:
    serie = (
        db.query(Serie)
        .options(selectinload(Serie.categoria), selectinload(Serie.episodios))
        .filter(Serie.id == serie_id, Serie.status == StatusSerie.publicado)
        .first()
    )
    if serie is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Série não encontrada")

    na_minha_lista = isinstance(viewer, Cliente) and (
        db.query(MinhaLista).filter(MinhaLista.cliente_id == viewer.id, MinhaLista.serie_id == serie_id).first()
        is not None
    )

    episodios = sorted(serie.episodios, key=lambda e: e.ordem)

    return SerieDetalheOut(
        id=serie.id,
        titulo=serie.titulo,
        sinopse=serie.sinopse,
        capa_url=serie.capa_url,
        banner_url=serie.banner_url,
        ano=serie.ano,
        categoria=serie.categoria.nome if serie.categoria else None,
        na_minha_lista=na_minha_lista,
        episodios=[
            EpisodioCatalogoOut(
                id=e.id,
                numero=e.numero,
                titulo=e.titulo,
                descricao=e.descricao,
                thumbnail_url=e.thumbnail_url,
                duracao_segundos=e.duracao_segundos,
                ordem=e.ordem,
                fonte=e.fonte,
                youtube_video_id=e.youtube_video_id,
            )
            for e in episodios
        ],
    )


@router.get("/episodios/{episodio_id}", response_model=EpisodioPlayerOut)
def obter_episodio(
    episodio_id: int, db: Session = Depends(get_db), viewer: Admin | Cliente = Depends(get_current_viewer_ativo)
) -> EpisodioPlayerOut:
    episodio = (
        db.query(Episodio).options(selectinload(Episodio.serie)).filter(Episodio.id == episodio_id).first()
    )
    # Admin pode pré-visualizar episódios de qualquer série (inclusive fora do ar);
    # cliente só acessa episódios de séries já publicadas.
    if episodio is None or (isinstance(viewer, Cliente) and episodio.serie.status != StatusSerie.publicado):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Episódio não encontrado")

    progresso = (
        db.query(Progresso)
        .filter(Progresso.cliente_id == viewer.id, Progresso.episodio_id == episodio_id)
        .first()
        if isinstance(viewer, Cliente)
        else None
    )

    proximo = (
        db.query(Episodio)
        .filter(Episodio.serie_id == episodio.serie_id, Episodio.ordem > episodio.ordem)
        .order_by(Episodio.ordem)
        .first()
    )

    return EpisodioPlayerOut(
        id=episodio.id,
        numero=episodio.numero,
        titulo=episodio.titulo,
        descricao=episodio.descricao,
        thumbnail_url=episodio.thumbnail_url,
        duracao_segundos=episodio.duracao_segundos,
        ordem=episodio.ordem,
        fonte=episodio.fonte,
        youtube_video_id=episodio.youtube_video_id,
        serie_id=episodio.serie_id,
        serie_titulo=episodio.serie.titulo,
        segundos_assistidos=progresso.segundos_assistidos if progresso else 0,
        concluido=progresso.concluido if progresso else False,
        proximo_episodio=ProximoEpisodioOut(
            id=proximo.id, numero=proximo.numero, titulo=proximo.titulo, thumbnail_url=proximo.thumbnail_url
        )
        if proximo
        else None,
    )


@router.post("/progresso", status_code=status.HTTP_204_NO_CONTENT)
def salvar_progresso(
    data: ProgressoIn, db: Session = Depends(get_db), cliente: Cliente = Depends(get_current_cliente_ativo)
) -> None:
    episodio = db.get(Episodio, data.episodio_id)
    if episodio is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Episódio não encontrado")

    progresso = (
        db.query(Progresso)
        .filter(Progresso.cliente_id == cliente.id, Progresso.episodio_id == data.episodio_id)
        .first()
    )
    if progresso is None:
        progresso = Progresso(cliente_id=cliente.id, episodio_id=data.episodio_id)
        db.add(progresso)

    progresso.segundos_assistidos = data.segundos_assistidos
    progresso.concluido = data.concluido
    db.commit()
