import { Check, Play, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { useAdminAuth } from "@/auth/AdminAuthContext";
import { useClienteAuth } from "@/auth/ClienteAuthContext";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";
import { useSerieDetalhe } from "@/hooks/useCatalogo";
import { useAdicionarMinhaLista, useRemoverMinhaLista } from "@/hooks/useMinhaLista";

const EPISODIOS_POR_PAGINA = 12;

function formatarDuracao(segundos: number | null): string {
  if (!segundos) return "";
  const min = Math.round(segundos / 60);
  return `${min} min`;
}

function SerieDetalhesSkeleton() {
  return (
    <div className="pb-16">
      <Skeleton className="h-[45vh] min-h-[280px] w-full rounded-none" />
      <div className="-mt-20 space-y-4 px-4 md:px-12">
        <Skeleton className="h-9 w-2/3 max-w-md" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-16 w-full max-w-2xl" />
        <div className="flex gap-3">
          <Skeleton className="h-11 w-32" />
          <Skeleton className="h-11 w-32" />
        </div>
        <div className="max-w-3xl space-y-2 pt-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function SerieDetalhes() {
  const { id } = useParams<{ id: string }>();
  const serieId = Number(id);
  const { data: serie, isLoading } = useSerieDetalhe(serieId);
  const adicionar = useAdicionarMinhaLista();
  const remover = useRemoverMinhaLista();
  const { cliente } = useClienteAuth();
  const { admin } = useAdminAuth();
  // "Minha Lista" é um dado pessoal do cliente — admin visualizando o site sem conta de
  // cliente não tem onde persistir isso.
  const podeUsarMinhaLista = !!cliente || !admin;

  const [pagina, setPagina] = useState(1);
  useEffect(() => {
    setPagina(1);
  }, [id]);

  if (isLoading) return <SerieDetalhesSkeleton />;
  if (!serie) {
    return (
      <div className="flex min-h-screen items-center justify-center text-white/60">
        Série não encontrada.
      </div>
    );
  }

  const primeiroEpisodio = serie.episodios[0];
  const totalPaginas = Math.ceil(serie.episodios.length / EPISODIOS_POR_PAGINA);
  const episodiosPagina = serie.episodios.slice(
    (pagina - 1) * EPISODIOS_POR_PAGINA,
    pagina * EPISODIOS_POR_PAGINA,
  );

  function toggleMinhaLista() {
    if (!serie) return;
    if (serie.na_minha_lista) remover.mutate(serie.id);
    else adicionar.mutate(serie.id);
  }

  return (
    <div className="pb-16 text-white">
      <div className="relative h-[45vh] min-h-[280px] w-full">
        {serie.banner_url ? (
          <img src={serie.banner_url} alt={serie.titulo} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-surface-alt to-black" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" />
      </div>

      <div className="-mt-20 px-4 md:px-12">
        <h1 className="mb-2 text-3xl font-bold md:text-4xl">{serie.titulo}</h1>
        <div className="mb-4 flex gap-3 text-sm text-white/60">
          {serie.ano && <span>{serie.ano}</span>}
          {serie.categoria && <span>{serie.categoria}</span>}
          <span>{serie.episodios.length} episódio(s)</span>
        </div>
        {serie.sinopse && <p className="mb-6 max-w-2xl text-white/80">{serie.sinopse}</p>}

        <div className="mb-8 flex gap-3">
          {primeiroEpisodio && (
            <Link
              to={`/assistir/${primeiroEpisodio.id}`}
              className="flex items-center gap-2 rounded bg-white px-6 py-2.5 font-semibold text-black transition hover:bg-white/85"
            >
              <Play size={18} className="fill-black" />
              Assistir
            </Link>
          )}
          {podeUsarMinhaLista && (
            <button
              onClick={toggleMinhaLista}
              className="flex items-center gap-2 rounded border border-white/30 px-5 py-2.5 font-semibold transition hover:bg-white/10"
            >
              {serie.na_minha_lista ? <Check size={18} /> : <Plus size={18} />}
              Minha Lista
            </button>
          )}
        </div>

        <div className="mb-4 flex items-baseline justify-between border-b border-white/10 pb-3">
          <h2 className="text-xl font-semibold md:text-2xl">Episódios</h2>
          <span className="text-sm text-white/50">{serie.episodios.length} episódio(s)</span>
        </div>

        {serie.episodios.length === 0 ? (
          <p className="py-8 text-center text-white/50">Nenhum episódio disponível ainda.</p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-6">
            {episodiosPagina.map((ep) => (
              <Link
                key={ep.id}
                to={`/assistir/${ep.id}`}
                className="group flex h-full flex-col overflow-hidden rounded bg-surface-alt transition hover:bg-white/10"
              >
                <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-black/40">
                  {ep.thumbnail_url && (
                    <img src={ep.thumbnail_url} alt="" className="h-full w-full object-cover" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <Play size={30} className="fill-white text-white" />
                  </div>
                  {ep.duracao_segundos && (
                    <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-xs">
                      {formatarDuracao(ep.duracao_segundos)}
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-3">
                  <p className="text-sm font-medium">
                    {ep.numero !== null && <span className="text-white/50">#{ep.numero} </span>}
                    {ep.titulo}
                  </p>
                  {ep.descricao && <p className="mt-1 line-clamp-2 text-xs text-white/50">{ep.descricao}</p>}
                </div>
              </Link>
            ))}
          </div>
        )}

        <Pagination pagina={pagina} totalPaginas={totalPaginas} total={serie.episodios.length} onChange={setPagina} />
      </div>
    </div>
  );
}
