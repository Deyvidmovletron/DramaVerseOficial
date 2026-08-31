import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { PlanosSelecao } from "@/components/cliente/PlanosSelecao";
import { FullscreenLoader } from "@/components/ui/FullscreenLoader";
import { Skeleton } from "@/components/ui/Skeleton";
import { useClienteAuth } from "@/auth/ClienteAuthContext";
import { useIniciarTeste, usePlanosPublicos } from "@/hooks/useAssinatura";

function formatarData(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("pt-BR");
}

const SITUACAO_LABEL: Record<string, string> = {
  teste: "Em teste grátis",
  ativa: "Ativa",
  atrasada: "Pagamento pendente",
  pendente: "Aguardando pagamento",
  cancelada: "Cancelada",
};

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
  const { cliente, refetch } = useClienteAuth();
  const { data: planos, isLoading, isError } = usePlanosPublicos();
  const navigate = useNavigate();
  const iniciarTeste = useIniciarTeste();
  const [selecionadoId, setSelecionadoId] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  if (!cliente) return <FullscreenLoader />;

  const planoSelecionado = planos?.find((p) => p.id === selecionadoId) ?? null;
  // Teste grátis só vale para quem ainda não tem assinatura (mesma regra do backend).
  const semAssinatura = cliente.assinatura.status == null;
  const trialSelecionado =
    !!planoSelecionado && planoSelecionado.periodo_teste_dias > 0 && semAssinatura;

  async function handleContinuar() {
    if (!planoSelecionado) return;
    setErro(null);
    if (trialSelecionado) {
      try {
        await iniciarTeste.mutateAsync(planoSelecionado.id);
        await refetch();
        navigate("/", { replace: true });
      } catch (e) {
        const st = (e as { response?: { status?: number } })?.response?.status;
        // 409/400: o teste já foi usado ou o plano não tem teste — segue pro pagamento.
        if (st === 409 || st === 400) {
          navigate(`/assinatura/checkout/${planoSelecionado.id}`);
        } else {
          setErro("Não foi possível iniciar o teste grátis. Tente novamente.");
        }
      }
      return;
    }
    navigate(`/assinatura/checkout/${planoSelecionado.id}`);
  }

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
            <span>{SITUACAO_LABEL[cliente.assinatura.status] ?? cliente.assinatura.status}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-white/60">{cliente.assinatura.ativa ? "Válida até" : "Expirou em"}</span>
          <span>{formatarData(cliente.assinatura.data_expiracao)}</span>
        </div>
      </div>

      <h2 className="text-xl font-semibold">
        {cliente.assinatura.ativa ? "Trocar de plano" : "Planos disponíveis"}
      </h2>
      <p className="mb-4 mt-1 text-sm text-white/50">
        {!semAssinatura && !cliente.assinatura.ativa
          ? "Seu teste grátis já foi usado. Escolha um plano e pague com cartão (assinatura mensal) ou PIX."
          : "Cartão de crédito é assinatura recorrente mensal; PIX é pagamento avulso."}
      </p>

      {isLoading ? (
        <PlanosSkeleton />
      ) : isError ? (
        <p className="rounded border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Não foi possível carregar os planos disponíveis. Tente recarregar a página.
        </p>
      ) : (
        <>
          <PlanosSelecao
            planos={planos ?? []}
            selecionadoId={selecionadoId}
            onSelecionar={setSelecionadoId}
            mostrarSeloTeste={semAssinatura}
          />
          {erro && <p className="mt-4 text-sm text-red-300">{erro}</p>}
          {(planos?.length ?? 0) > 0 && (
            <button
              onClick={handleContinuar}
              disabled={!selecionadoId || iniciarTeste.isPending}
              className="mt-6 rounded bg-brand px-8 py-2.5 text-sm font-semibold hover:bg-brand-dark disabled:opacity-50"
            >
              {!selecionadoId
                ? "Selecione um plano"
                : iniciarTeste.isPending
                  ? "Ativando..."
                  : trialSelecionado
                    ? `Começar teste grátis de ${planoSelecionado!.periodo_teste_dias} ${
                        planoSelecionado!.periodo_teste_dias === 1 ? "dia" : "dias"
                      } (sem cartão)`
                    : "Continuar"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
