import { Link, useNavigate } from "react-router-dom";

import { useClienteAuth } from "@/auth/ClienteAuthContext";

export function AssinaturaBloqueada() {
  const { cliente, logout } = useClienteAuth();
  const navigate = useNavigate();

  const motivo =
    cliente?.status === "bloqueado"
      ? "Sua conta está bloqueada."
      : "Seu período de teste ou assinatura terminou. Escolha um plano e faça o pagamento para continuar assistindo.";

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-6 text-white">
      <div className="max-w-md text-center">
        <h1 className="mb-3 text-2xl font-bold">Acesso bloqueado</h1>
        <p className="mb-8 text-white/70">{motivo}</p>
        <div className="flex justify-center gap-3">
          {cliente?.status !== "bloqueado" && (
            <Link
              to="/assinatura"
              className="rounded bg-brand px-6 py-3 font-semibold transition hover:bg-brand-dark"
            >
              Ver planos
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="rounded bg-white/10 px-6 py-3 font-semibold transition hover:bg-white/20"
          >
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}
