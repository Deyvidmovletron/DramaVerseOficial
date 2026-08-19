import { type FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useClienteAuth } from "@/auth/ClienteAuthContext";

export function Login() {
  const { login } = useClienteAuth();
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
      const from = (location.state as { from?: Location })?.from?.pathname ?? "/";
      navigate(from, { replace: true });
    } catch {
      setErro("E-mail ou senha inválidos.");
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
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded bg-black/75 p-10 text-white shadow-xl"
      >
        <h1 className="mb-6 text-3xl font-bold">Entrar</h1>

        {erro && (
          <div className="mb-4 rounded bg-brand/20 px-3 py-2 text-sm text-red-200">{erro}</div>
        )}

        <div className="mb-3">
          <label htmlFor="login-email" className="sr-only">
            E-mail
          </label>
          <input
            id="login-email"
            type="email"
            required
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border border-white/10 bg-[#333] px-4 py-3 text-sm outline-none focus:border-white/40"
          />
        </div>

        <div className="mb-2">
          <label htmlFor="login-senha" className="sr-only">
            Senha
          </label>
          <input
            id="login-senha"
            type="password"
            required
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="w-full rounded border border-white/10 bg-[#333] px-4 py-3 text-sm outline-none focus:border-white/40"
          />
        </div>

        <Link to="/esqueci-senha" className="mb-5 inline-block text-sm text-white/50 hover:text-white">
          Esqueci minha senha
        </Link>

        <button
          type="submit"
          disabled={carregando}
          className="w-full rounded bg-brand py-3 font-semibold transition hover:bg-brand-dark disabled:opacity-60"
        >
          {carregando ? "Entrando..." : "Entrar"}
        </button>

        <p className="mt-6 text-sm text-white/50">
          Acesso restrito a assinantes. Problemas para entrar? Fale com o suporte.
        </p>
      </form>
    </div>
  );
}
