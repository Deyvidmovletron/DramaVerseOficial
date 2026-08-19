import { type FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useAdminAuth } from "@/auth/AdminAuthContext";

export function AdminLogin() {
  const { login } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      await login(email, senha);
      const from = (location.state as { from?: Location })?.from?.pathname ?? "/admin";
      navigate(from, { replace: true });
    } catch {
      setErro("E-mail ou senha inválidos.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-6 text-white">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded border border-white/10 bg-black/40 p-10 shadow-xl"
      >
        <h1 className="mb-6 text-2xl font-bold text-brand">Painel Master</h1>

        {erro && (
          <div className="mb-4 rounded bg-brand/20 px-3 py-2 text-sm text-red-200">{erro}</div>
        )}

        <div className="mb-3">
          <label htmlFor="admin-login-email" className="sr-only">
            E-mail
          </label>
          <input
            id="admin-login-email"
            type="email"
            required
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-brand"
          />
        </div>

        <div className="mb-2">
          <label htmlFor="admin-login-senha" className="sr-only">
            Senha
          </label>
          <input
            id="admin-login-senha"
            type="password"
            required
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="w-full rounded border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-brand"
          />
        </div>

        <Link to="/admin/esqueci-senha" className="mb-5 inline-block text-sm text-white/50 hover:text-white">
          Esqueci minha senha
        </Link>

        <button
          type="submit"
          disabled={carregando}
          className="w-full rounded bg-brand py-3 font-semibold transition hover:bg-brand-dark disabled:opacity-60"
        >
          {carregando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
