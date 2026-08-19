import { Carrossel } from "@/components/catalogo/Carrossel";
import { ContinuarAssistindoRow } from "@/components/catalogo/ContinuarAssistindoRow";
import { HeroSlider } from "@/components/catalogo/HeroSlider";
import { Skeleton } from "@/components/ui/Skeleton";
import { useHome } from "@/hooks/useCatalogo";

function HomeSkeleton() {
  return (
    <div className="pb-16">
      <Skeleton className="h-[60vh] min-h-[380px] w-full rounded-none" />
      <div className="-mt-16 space-y-8 px-4 md:-mt-24 md:px-12">
        {[1, 2, 3].map((linha) => (
          <div key={linha}>
            <Skeleton className="mb-3 h-5 w-40" />
            <div className="flex gap-2 md:gap-3">
              {[1, 2, 3, 4, 5, 6].map((card) => (
                <Skeleton key={card} className="aspect-[2/3] w-36 shrink-0 md:w-44" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Home() {
  const { data, isLoading } = useHome();

  if (isLoading) return <HomeSkeleton />;

  if (!data || data.destaques.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Nenhuma série disponível ainda</h1>
          <p className="mt-2 text-white/60">Volte em breve — novos conteúdos estão sendo adicionados.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-16">
      <HeroSlider series={data.destaques} />
      <div className="-mt-16 md:-mt-24">
        <ContinuarAssistindoRow itens={data.continuar_assistindo} />
        {data.carrosseis.map((carrossel) => (
          <Carrossel key={carrossel.categoria} carrossel={carrossel} />
        ))}
      </div>
    </div>
  );
}
