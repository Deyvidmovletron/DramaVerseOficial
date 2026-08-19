import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";

import { clienteApi } from "@/api/clienteApi";

export function EsqueciSenha() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setCarregando(true);
    try {
      await clienteApi.post("/auth/cliente/esqueci-senha", { email });
    } finally {
      setCarregando(false);
      setEnviado(true);
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
        <h1 className="mb-6 text-2xl font-bold">Esqueci minha senha</h1>

        {enviado ? (
          <p className="text-sm text-white/80">
            Se esse e-mail estiver cadastrado, enviamos um link de redefinição de senha para ele.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <p className="mb-4 text-sm text-white/60">
              Informe seu e-mail e enviaremos um link para você criar uma nova senha.
            </p>
            <div className="mb-5">
              <label htmlFor="esqueci-senha-email" className="sr-only">
                E-mail
              </label>
              <input
                id="esqueci-senha-email"
                type="email"
                required
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded border border-white/10 bg-[#333] px-4 py-3 text-sm outline-none focus:border-white/40"
              />
            </div>
            <button
              type="submit"
              disabled={carregando}
              className="w-full rounded bg-brand py-3 font-semibold transition hover:bg-brand-dark disabled:opacity-60"
            >
              {carregando ? "Enviando..." : "Enviar link"}
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
