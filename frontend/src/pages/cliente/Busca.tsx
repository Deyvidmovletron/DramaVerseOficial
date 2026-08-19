import { SearchIcon } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";

import { SerieCardItem } from "@/components/catalogo/SerieCardItem";
import { Skeleton } from "@/components/ui/Skeleton";
import { useBusca, useCategoriasCatalogo } from "@/hooks/useCatalogo";

export function Busca() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [termo, setTermo] = useState("");
  const categoriaIdParam = searchParams.get("categoria_id");
  const categoriaId = categoriaIdParam ? Number(categoriaIdParam) : null;

  const { data: categorias } = useCategoriasCatalogo();
  const { data: resultados, isFetching, isError } = useBusca(termo, categoriaId);

  function handleCategoriaChange(valor: string) {
    if (valor) {
      setSearchParams({ categoria_id: valor });
    } else {
      setSearchParams({});
    }
  }

  const buscouAlgo = termo.trim().length > 0 || categoriaId !== null;
  const categoriaAtual = categorias?.find((c) => c.id === categoriaId);

  return (
    <div className="min-h-screen px-4 pb-16 pt-24 text-white md:px-12">
      <div className="mb-8 flex flex-wrap gap-3">
        <div className="flex max-w-md flex-1 items-center gap-2 rounded border border-white/20 bg-black/40 px-4 py-3">
          <SearchIcon size={18} className="text-white/50" />
          <label htmlFor="busca-termo" className="sr-only">
            Buscar séries
          </label>
          <input
            id="busca-termo"
            autoFocus
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Buscar séries..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-white/40"
          />
        </div>

        <div>
          <label htmlFor="busca-categoria" className="sr-only">
            Filtrar por gênero
          </label>
          <select
            id="busca-categoria"
            value={categoriaId ?? ""}
            onChange={(e) => handleCategoriaChange(e.target.value)}
            className="rounded border border-white/20 bg-black/40 px-4 py-3 text-sm outline-none focus:border-white/40"
          >
            <option value="">Todos os gêneros</option>
            {categorias?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isError && buscouAlgo && <p className="text-red-300">Não foi possível buscar agora. Tente novamente.</p>}
      {!isFetching && !isError && buscouAlgo && resultados?.length === 0 && (
        <p className="text-white/50">
          {termo.trim()
            ? `Nenhum resultado para “${termo}”${categoriaAtual ? ` em ${categoriaAtual.nome}` : ""}.`
            : `Nenhuma série em ${categoriaAtual?.nome ?? "essa categoria"} ainda.`}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        {isFetching
          ? [1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="aspect-[2/3] w-36 shrink-0 md:w-44" />)
          : !isError && resultados?.map((serie) => <SerieCardItem key={serie.id} serie={serie} />)}
      </div>
    </div>
  );
}
