import { useNavigate } from "react-router-dom";

import { FullscreenLoader } from "@/components/ui/FullscreenLoader";
import { Skeleton } from "@/components/ui/Skeleton";
import { useClienteAuth } from "@/auth/ClienteAuthContext";
import { usePlanosPublicos } from "@/hooks/useAssinatura";

function formatarData(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("pt-BR");
}

function centavosParaReais(centavos: number): string {
  return (centavos / 100).toFixed(2).replace(".", ",");
}

function PlanosSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex flex-col rounded border border-white/10 bg-black/30 p-5">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="mt-2 h-4 w-full" />
          <Skeleton className="mt-3 h-8 w-32" />
          <Skeleton className="mt-4 h-10 w-full" />
        </div>
      ))}
    </div>
  );
}

export function Assinatura() {
  const { cliente } = useClienteAuth();
  const { data: planos, isLoading, isError } = usePlanosPublicos();
  const navigate = useNavigate();

  if (!cliente) return <FullscreenLoader />;

  return (
    <div className="min-h-screen px-4 pb-16 pt-24 text-white md:px-12">
      <h1 className="mb-6 text-2xl font-semibold">Minha assinatura</h1>

      <div className="mb-10 max-w-md rounded border border-white/10 bg-black/30 p-6">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-white/60">Status</span>
          <span
            className={`rounded px-2 py-0.5 text-sm ${
              cliente.assinatura.ativa ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"
            }`}
          >
            {cliente.assinatura.ativa ? "Ativa" : "Inativa"}
          </span>
        </div>

        {cliente.assinatura.status && (
          <div className="mb-4 flex items-center justify-between">
            <span className="text-white/60">Situação</span>
            <span>{cliente.assinatura.status}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-white/60">Válida até</span>
          <span>{formatarData(cliente.assinatura.data_expiracao)}</span>
        </div>
      </div>

      <h2 className="mb-4 text-xl font-semibold">
        {cliente.assinatura.ativa ? "Trocar de plano" : "Planos disponíveis"}
      </h2>

      {isLoading ? (
        <PlanosSkeleton />
      ) : isError ? (
        <p className="rounded border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Não foi possível carregar os planos disponíveis. Tente recarregar a página.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {planos?.map((plano) => (
            <div key={plano.id} className="flex flex-col rounded border border-white/10 bg-black/30 p-5">
              <h3 className="text-lg font-semibold">{plano.nome}</h3>
              {plano.descricao && <p className="mt-1 flex-1 text-sm text-white/60">{plano.descricao}</p>}
              <p className="mt-3 text-2xl font-bold">
                R$ {centavosParaReais(plano.preco_centavos)}
                <span className="text-sm font-normal text-white/50"> / {plano.duracao_dias} dias</span>
              </p>
              <button
                onClick={() => navigate(`/assinatura/checkout/${plano.id}`)}
                className="mt-4 rounded bg-brand py-2.5 text-sm font-semibold hover:bg-brand-dark"
              >
                Assinar
              </button>
            </div>
          ))}
          {planos?.length === 0 && <p className="text-white/50">Nenhum plano disponível no momento.</p>}
        </div>
      )}
    </div>
  );
}
