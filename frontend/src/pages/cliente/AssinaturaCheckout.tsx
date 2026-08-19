import { AlertCircle, CheckCircle2, ChevronLeft, CreditCard, QrCode } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useClienteAuth } from "@/auth/ClienteAuthContext";
import { CheckoutCartaoBrick } from "@/components/cliente/CheckoutCartaoBrick";
import { CheckoutPix } from "@/components/cliente/CheckoutPix";
import { Skeleton } from "@/components/ui/Skeleton";
import { usePlanosPublicos } from "@/hooks/useAssinatura";
import type { CheckoutCartaoResultado } from "@/types/catalogo";

function centavosParaReais(centavos: number): string {
  return (centavos / 100).toFixed(2).replace(".", ",");
}

type Metodo = "cartao" | "pix";
type Etapa = "pagamento" | "sucesso" | "pendente";

export function AssinaturaCheckout() {
  const { planoId: planoIdParam } = useParams<{ planoId: string }>();
  const planoId = Number(planoIdParam);
  const navigate = useNavigate();
  const { refetch: refetchCliente } = useClienteAuth();

  const { data: planos, isLoading } = usePlanosPublicos();
  const plano = planos?.find((p) => p.id === planoId);

  const [metodo, setMetodo] = useState<Metodo>("cartao");
  const [etapa, setEtapa] = useState<Etapa>("pagamento");
  const [erro, setErro] = useState<string | null>(null);
  const [mensagemPendente, setMensagemPendente] = useState<string | null>(null);

  async function handleResultadoCartao(resultado: CheckoutCartaoResultado) {
    if (resultado.status === "ativa") {
      await refetchCliente();
      setEtapa("sucesso");
    } else if (resultado.status === "recusada") {
      setErro(resultado.mensagem ?? "Pagamento recusado. Tente outro cartão.");
    } else {
      setMensagemPendente(resultado.mensagem ?? "Pagamento em análise.");
      setEtapa("pendente");
    }
  }

  async function handleAprovadoPix() {
    await refetchCliente();
    setEtapa("sucesso");
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-md px-4 pb-16 pt-24">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-4 h-40 w-full" />
      </div>
    );
  }

  if (!plano) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center text-white/60">
        <div>
          <p>Plano não encontrado.</p>
          <Link to="/assinatura" className="mt-3 inline-block text-brand hover:underline">
            Voltar pra assinatura
          </Link>
        </div>
      </div>
    );
  }

  if (etapa === "sucesso") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center text-white">
        <CheckCircle2 size={56} className="mb-4 text-green-400" />
        <h1 className="text-2xl font-semibold">Assinatura ativada!</h1>
        <p className="mt-2 max-w-sm text-white/60">
          Seu acesso ao plano {plano.nome} já está liberado. Aproveite o catálogo.
        </p>
        <button
          onClick={() => navigate("/")}
          className="mt-6 rounded bg-brand px-6 py-2.5 font-semibold hover:bg-brand-dark"
        >
          Ir para o catálogo
        </button>
      </div>
    );
  }

  if (etapa === "pendente") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center text-white">
        <div className="mb-4 rounded-full bg-yellow-500/20 p-3">
          <AlertCircle size={32} className="text-yellow-300" />
        </div>
        <h1 className="text-2xl font-semibold">Pagamento em análise</h1>
        <p className="mt-2 max-w-sm text-white/60">{mensagemPendente}</p>
        <Link to="/assinatura" className="mt-6 rounded border border-white/20 px-6 py-2.5 font-semibold hover:bg-white/10">
          Voltar pra assinatura
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-16 pt-24 text-white">
      <Link to="/assinatura" className="mb-4 inline-flex items-center gap-1 text-sm text-white/50 hover:text-white">
        <ChevronLeft size={16} />
        Voltar
      </Link>

      <div className="mb-6 rounded border border-white/10 bg-black/30 p-5">
        <p className="text-sm text-white/50">Assinando</p>
        <p className="text-lg font-semibold">{plano.nome}</p>
        <p className="mt-1 text-2xl font-bold">
          R$ {centavosParaReais(plano.preco_centavos)}
          <span className="text-sm font-normal text-white/50"> / {plano.duracao_dias} dias</span>
        </p>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2 rounded border border-white/10 bg-black/20 p-1">
        <button
          onClick={() => {
            setMetodo("cartao");
            setErro(null);
          }}
          className={`flex items-center justify-center gap-2 rounded py-2.5 text-sm font-semibold transition ${
            metodo === "cartao" ? "bg-brand text-white" : "text-white/60 hover:text-white"
          }`}
        >
          <CreditCard size={16} />
          Cartão
        </button>
        <button
          onClick={() => {
            setMetodo("pix");
            setErro(null);
          }}
          className={`flex items-center justify-center gap-2 rounded py-2.5 text-sm font-semibold transition ${
            metodo === "pix" ? "bg-brand text-white" : "text-white/60 hover:text-white"
          }`}
        >
          <QrCode size={16} />
          PIX
        </button>
      </div>

      {erro && (
        <div className="mb-4 flex items-start gap-2 rounded border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          {erro}
        </div>
      )}

      <div className="rounded border border-white/10 bg-black/20 p-4">
        {metodo === "cartao" ? (
          <CheckoutCartaoBrick
            key={plano.id}
            planoId={plano.id}
            valorReais={plano.preco_centavos / 100}
            onResultado={handleResultadoCartao}
            onErro={setErro}
          />
        ) : (
          <CheckoutPix key={plano.id} planoId={plano.id} onAprovado={handleAprovadoPix} onErro={setErro} />
        )}
      </div>

      {metodo === "pix" && (
        <p className="mt-3 text-center text-xs text-white/40">
          PIX não renova automaticamente — você paga de novo ao final do período.
        </p>
      )}
    </div>
  );
}
