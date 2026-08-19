import { type FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { clienteApi } from "@/api/clienteApi";

export function RedefinirSenha() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);

    if (novaSenha !== confirmacao) {
      setErro("As senhas não coincidem.");
      return;
    }

    setCarregando(true);
    try {
      await clienteApi.post("/auth/cliente/redefinir-senha", { token, nova_senha: novaSenha });
      navigate("/login", { replace: true, state: { senhaRedefinida: true } });
    } catch {
      setErro("Esse link é inválido ou já expirou. Solicite um novo.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-black bg-cover bg-center px-6"
      style={{
        backgroundImage:
          "linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.85)), radial-gradient(circle at top, #3a0a0a, #000 60%)",
      }}
    >
      <div className="w-full max-w-sm rounded bg-black/75 p-10 text-white shadow-xl">
        <h1 className="mb-6 text-2xl font-bold">Nova senha</h1>

        {!token ? (
          <p className="text-sm text-red-300">Link inválido. Solicite a redefinição de senha novamente.</p>
        ) : (
          <form onSubmit={handleSubmit}>
            {erro && <div className="mb-4 rounded bg-brand/20 px-3 py-2 text-sm text-red-200">{erro}</div>}
            <div className="mb-3">
              <label htmlFor="redefinir-nova-senha" className="sr-only">
                Nova senha
              </label>
              <input
                id="redefinir-nova-senha"
                type="password"
                required
                minLength={6}
                placeholder="Nova senha"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                className="w-full rounded border border-white/10 bg-[#333] px-4 py-3 text-sm outline-none focus:border-white/40"
              />
            </div>
            <div className="mb-5">
              <label htmlFor="redefinir-confirmacao" className="sr-only">
                Confirme a nova senha
              </label>
              <input
                id="redefinir-confirmacao"
                type="password"
                required
                minLength={6}
                placeholder="Confirme a nova senha"
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                className="w-full rounded border border-white/10 bg-[#333] px-4 py-3 text-sm outline-none focus:border-white/40"
              />
            </div>
            <button
              type="submit"
              disabled={carregando}
              className="w-full rounded bg-brand py-3 font-semibold transition hover:bg-brand-dark disabled:opacity-60"
            >
              {carregando ? "Salvando..." : "Redefinir senha"}
            </button>
          </form>
        )}

        <Link to="/login" className="mt-6 block text-sm text-white/50 hover:text-white">
          ← Voltar para o login
        </Link>
      </div>
    </div>
  );
}
