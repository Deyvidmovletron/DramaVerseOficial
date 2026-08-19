import { LogOut, Menu, Search, X } from "lucide-react";
import { useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";

import { useAdminAuth } from "@/auth/AdminAuthContext";
import { useClienteAuth } from "@/auth/ClienteAuthContext";

export function ClienteLayout() {
  const { cliente, logout: logoutCliente } = useClienteAuth();
  const { admin, logout: logoutAdmin } = useAdminAuth();
  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);

  // Sem sessão de cliente, mas com sessão de admin: é o admin navegando pelas áreas
  // comuns do site. Assinatura e Minha Conta são conceitos de conta de cliente, então
  // não se aplicam aqui.
  const comoAdmin = !cliente && !!admin;

  function handleLogout() {
    setMenuAberto(false);
    if (comoAdmin) {
      logoutAdmin();
      navigate("/admin/login", { replace: true });
    } else {
      logoutCliente();
      navigate("/login", { replace: true });
    }
  }

  function fecharMenu() {
    setMenuAberto(false);
  }

  return (
    <div className="min-h-full bg-bg text-white">
      <header className="fixed inset-x-0 top-0 z-50 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center justify-between px-4 py-3 md:px-12">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-2xl font-bold tracking-tight text-brand" onClick={fecharMenu}>
              STREAM+
            </Link>
            <Link to="/minha-lista" className="hidden text-sm text-white/80 hover:text-white sm:inline">
              Minha Lista
            </Link>
          </div>
          <div className="flex items-center gap-4 text-sm text-white/80">
            <Link to="/buscar" className="hover:text-white" title="Buscar">
              <Search size={18} />
            </Link>
            {comoAdmin ? (
              <span className="hidden rounded bg-white/10 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-white/70 sm:inline">
                Visualizando como admin
              </span>
            ) : (
              <>
                <Link to="/assinatura" className="hidden text-sm hover:text-white sm:inline">
                  Assinatura
                </Link>
                <Link to="/minha-conta" className="hidden text-sm hover:text-white sm:inline">
                  {cliente?.nome}
                </Link>
              </>
            )}
            <button
              onClick={handleLogout}
              className="hidden items-center gap-1 rounded px-2 py-1 hover:bg-white/10 sm:flex"
              title="Sair"
            >
              <LogOut size={16} />
            </button>
            <button
              onClick={() => setMenuAberto((v) => !v)}
              className="rounded p-1 hover:bg-white/10 sm:hidden"
              title="Menu"
            >
              {menuAberto ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {menuAberto && (
          <nav className="flex flex-col border-t border-white/10 bg-black/95 px-4 py-2 text-sm sm:hidden">
            <Link to="/minha-lista" onClick={fecharMenu} className="rounded px-2 py-2.5 hover:bg-white/10">
              Minha Lista
            </Link>
            {comoAdmin ? (
              <span className="px-2 py-2.5 text-xs font-semibold uppercase tracking-wide text-white/50">
                Visualizando como admin
              </span>
            ) : (
              <>
                <Link to="/assinatura" onClick={fecharMenu} className="rounded px-2 py-2.5 hover:bg-white/10">
                  Assinatura
                </Link>
                <Link to="/minha-conta" onClick={fecharMenu} className="rounded px-2 py-2.5 hover:bg-white/10">
                  {cliente?.nome ?? "Minha conta"}
                </Link>
              </>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded px-2 py-2.5 text-left hover:bg-white/10"
            >
              <LogOut size={16} />
              Sair
            </button>
          </nav>
        )}
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
