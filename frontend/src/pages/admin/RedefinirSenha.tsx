import { type FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { adminApi } from "@/api/adminApi";

export function AdminRedefinirSenha() {
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
      await adminApi.post("/auth/admin/redefinir-senha", { token, nova_senha: novaSenha });
      navigate("/admin/login", { replace: true });
    } catch {
      setErro("Esse link é inválido ou já expirou. Solicite um novo.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-6 text-white">
      <div className="w-full max-w-sm rounded border border-white/10 bg-black/40 p-10 shadow-xl">
        <h1 className="mb-6 text-2xl font-bold text-brand">Nova senha</h1>

        {!token ? (
          <p className="text-sm text-red-300">Link inválido. Solicite a redefinição de senha novamente.</p>
        ) : (
          <form onSubmit={handleSubmit}>
            {erro && <div className="mb-4 rounded bg-brand/20 px-3 py-2 text-sm text-red-200">{erro}</div>}
            <div className="mb-3">
              <label htmlFor="admin-redefinir-nova-senha" className="sr-only">
                Nova senha
              </label>
              <input
                id="admin-redefinir-nova-senha"
                type="password"
                required
                minLength={6}
                placeholder="Nova senha"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                className="w-full rounded border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-brand"
              />
            </div>
            <div className="mb-5">
              <label htmlFor="admin-redefinir-confirmacao" className="sr-only">
                Confirme a nova senha
              </label>
              <input
                id="admin-redefinir-confirmacao"
                type="password"
                required
                minLength={6}
                placeholder="Confirme a nova senha"
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                className="w-full rounded border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-brand"
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

        <Link to="/admin/login" className="mt-6 block text-sm text-white/50 hover:text-white">
          ← Voltar para o login
        </Link>
      </div>
    </div>
  );
}
