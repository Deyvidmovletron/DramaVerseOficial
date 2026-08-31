import { Eye, EyeOff } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { useClienteAuth } from "@/auth/ClienteAuthContext";
import { CheckoutPagamento } from "@/components/cliente/CheckoutPagamento";
import { PlanosSelecao } from "@/components/cliente/PlanosSelecao";
import { Skeleton } from "@/components/ui/Skeleton";
import { useIniciarTeste, usePlanosPublicos } from "@/hooks/useAssinatura";

type Passo = "dados" | "pagamento";

const FUNDO = {
  backgroundImage:
    "linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.85)), radial-gradient(circle at top, #3a0a0a, #000 60%)",
};

/** Máscara de telefone BR: (11) 90000-0000 (celular) ou (11) 0000-0000 (fixo). */
function mascararTelefone(valor: string): string {
  const d = valor.replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function Registro() {
  const { cliente, registro, refetch } = useClienteAuth();
  const navigate = useNavigate();
  const { data: planos, isLoading, isError } = usePlanosPublicos();
  const iniciarTeste = useIniciarTeste();

  const [passo, setPasso] = useState<Passo>("dados");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [planoId, setPlanoId] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  // Fica true assim que o cadastro é submetido. A partir daí o `registro()` já
  // logou o cliente, então a navegação passa a ser toda explícita neste componente
  // (o guard abaixo não deve mais expulsar para "/").
  const [fluxoIniciado, setFluxoIniciado] = useState(false);

  const planoSelecionado = planos?.find((p) => p.id === planoId) ?? null;

  // Já logado e chegou aqui sem ter iniciado o cadastro: não faz sentido cadastrar de novo.
  if (cliente && passo === "dados" && !fluxoIniciado) return <Navigate to="/" replace />;

  async function handleContinuar(event: FormEvent) {
    event.preventDefault();
    setErro(null);

    if (!planoSelecionado) {
      setErro("Escolha um plano para continuar.");
      return;
    }
    if (senha !== confirmacao) {
      setErro("As senhas não coincidem.");
      return;
    }

    setFluxoIniciado(true);
    setEnviando(true);
    try {
      // Numa retentativa (falha depois do cadastro) o cliente já está logado — não recria.
      if (!cliente) {
        await registro({ nome, email, telefone, senha, senha_confirmacao: confirmacao });
      }
      if (planoSelecionado.periodo_teste_dias > 0) {
        // Teste grátis: sem cartão, sem pagamento — acesso liberado na hora.
        await iniciarTeste.mutateAsync(planoSelecionado.id);
        await refetch(); // recarrega o cliente com a assinatura de teste antes de navegar
        navigate("/", { replace: true });
        return;
      }
      setPasso("pagamento");
    } catch (e) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setErro(typeof detail === "string" ? detail : "Não foi possível criar a conta. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  if (passo === "pagamento" && planoSelecionado) {
    return (
      <div className="flex min-h-screen items-start justify-center bg-black bg-cover bg-center px-4 py-16" style={FUNDO}>
        <div className="w-full max-w-md rounded bg-black/75 p-8 shadow-xl">
          <h1 className="mb-1 text-2xl font-bold text-white">Quase lá, {nome.split(" ")[0]}!</h1>
          <p className="mb-6 text-sm text-white/50">Finalize o pagamento para liberar seu acesso.</p>
          <CheckoutPagamento plano={planoSelecionado} onSucesso={() => navigate("/", { replace: true })} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-start justify-center bg-black bg-cover bg-center px-4 py-16" style={FUNDO}>
      <div className="w-full max-w-4xl rounded bg-black/75 p-8 text-white shadow-xl">
        <h1 className="text-2xl font-bold">Criar conta</h1>
        <p className="mt-1 text-sm text-white/50">
          Já tem conta?{" "}
          <Link to="/login" className="text-brand hover:underline">
            Entrar
          </Link>
        </p>

        <form onSubmit={handleContinuar} className="mt-6 space-y-6">
          {erro && (
            <div className="rounded bg-brand/20 px-3 py-2 text-sm text-red-200">{erro}</div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="reg-nome" className="mb-1 block text-sm text-white/70">
                Nome completo
              </label>
              <input
                id="reg-nome"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full rounded border border-white/10 bg-[#333] px-4 py-3 text-sm outline-none focus:border-white/40"
              />
            </div>
            <div>
              <label htmlFor="reg-email" className="mb-1 block text-sm text-white/70">
                E-mail
              </label>
              <input
                id="reg-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded border border-white/10 bg-[#333] px-4 py-3 text-sm outline-none focus:border-white/40"
              />
            </div>
            <div>
              <label htmlFor="reg-telefone" className="mb-1 block text-sm text-white/70">
                Telefone (com DDD)
              </label>
              <input
                id="reg-telefone"
                type="tel"
                required
                inputMode="tel"
                placeholder="(11) 90000-0000"
                value={telefone}
                onChange={(e) => setTelefone(mascararTelefone(e.target.value))}
                className="w-full rounded border border-white/10 bg-[#333] px-4 py-3 text-sm outline-none focus:border-white/40"
              />
            </div>
            <div>
              <label htmlFor="reg-senha" className="mb-1 block text-sm text-white/70">
                Senha
              </label>
              <div className="relative">
                <input
                  id="reg-senha"
                  type={mostrarSenha ? "text" : "password"}
                  required
                  minLength={6}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full rounded border border-white/10 bg-[#333] px-4 py-3 pr-11 text-sm outline-none focus:border-white/40"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-white/40 hover:text-white/80"
                >
                  {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="reg-confirmacao" className="mb-1 block text-sm text-white/70">
                Confirmar senha
              </label>
              <div className="relative">
                <input
                  id="reg-confirmacao"
                  type={mostrarSenha ? "text" : "password"}
                  required
                  minLength={6}
                  value={confirmacao}
                  onChange={(e) => setConfirmacao(e.target.value)}
                  className="w-full rounded border border-white/10 bg-[#333] px-4 py-3 pr-11 text-sm outline-none focus:border-white/40"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-white/40 hover:text-white/80"
                >
                  {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          <div>
            <h2 className="mb-1 text-lg font-semibold">Escolha seu plano</h2>
            <p className="mb-4 text-sm text-white/50">
              {!planoSelecionado
                ? "Selecione um plano para continuar."
                : planoSelecionado.periodo_teste_dias > 0
                  ? `Acesso liberado na hora, sem cartão. Ao fim dos ${planoSelecionado.periodo_teste_dias} ${
                      planoSelecionado.periodo_teste_dias === 1 ? "dia" : "dias"
                    } de teste você escolhe como pagar (cartão recorrente ou PIX).`
                  : "Cartão de crédito é assinatura recorrente mensal; PIX é avulso. O pagamento é o próximo passo."}
            </p>

            {isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-44 w-full" />
                ))}
              </div>
            ) : isError ? (
              <p className="rounded border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                Não foi possível carregar os planos. Recarregue a página.
              </p>
            ) : (
              <PlanosSelecao planos={planos ?? []} selecionadoId={planoId} onSelecionar={setPlanoId} />
            )}
          </div>

          <button
            type="submit"
            disabled={enviando || !planoSelecionado}
            className="w-full rounded bg-brand py-3 font-semibold transition hover:bg-brand-dark disabled:opacity-60"
          >
            {enviando
              ? "Criando conta..."
              : !planoSelecionado
                ? "Selecione um plano acima"
                : planoSelecionado.periodo_teste_dias > 0
                  ? `Começar teste grátis de ${planoSelecionado.periodo_teste_dias} ${
                      planoSelecionado.periodo_teste_dias === 1 ? "dia" : "dias"
                    } (sem cartão)`
                  : "Continuar para o pagamento"}
          </button>
        </form>
      </div>
    </div>
  );
}
