import { SerieCardItem } from "@/components/catalogo/SerieCardItem";
import { Skeleton } from "@/components/ui/Skeleton";
import { useMinhaLista } from "@/hooks/useMinhaLista";

export function MinhaLista() {
  const { data: series, isLoading, isError } = useMinhaLista();

  return (
    <div className="min-h-screen px-4 pb-16 pt-24 text-white md:px-12">
      <h1 className="mb-6 text-2xl font-semibold">Minha Lista</h1>

      {isError && <p className="text-red-300">Não foi possível carregar sua lista agora. Tente novamente.</p>}
      {!isLoading && !isError && series?.length === 0 && (
        <p className="text-white/50">Você ainda não adicionou nenhuma série à sua lista.</p>
      )}

      <div className="flex flex-wrap gap-3">
        {isLoading
          ? [1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="aspect-[2/3] w-36 shrink-0 md:w-44" />)
          : !isError && series?.map((serie) => <SerieCardItem key={serie.id} serie={serie} />)}
      </div>
    </div>
  );
}
