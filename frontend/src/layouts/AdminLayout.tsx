import { CreditCard, Globe, Layers, LayoutDashboard, ListVideo, LogOut, Receipt, Users } from "lucide-react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAdminAuth } from "@/auth/AdminAuthContext";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/series", label: "Séries", icon: ListVideo, end: false },
  { to: "/admin/categorias", label: "Categorias", icon: Layers, end: false },
  { to: "/admin/planos", label: "Planos", icon: CreditCard, end: false },
  { to: "/admin/clientes", label: "Clientes", icon: Users, end: false },
  { to: "/admin/assinaturas", label: "Assinaturas", icon: Receipt, end: false },
];

export function AdminLayout() {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/admin/login", { replace: true });
  }

  return (
    <div className="flex min-h-full bg-surface text-white">
      <aside className="flex w-60 shrink-0 flex-col border-r border-white/10 bg-black/40 p-4">
        <span className="mb-6 text-xl font-bold text-brand">STREAM+ Admin</span>

        <nav className="flex-1 space-y-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded px-3 py-2 text-sm transition ${
                  isActive ? "bg-brand text-white" : "text-white/70 hover:bg-white/10"
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 pt-3 text-sm">
          <Link
            to="/"
            target="_blank"
            rel="noopener noreferrer"
            className="mb-1 flex items-center gap-2 rounded px-3 py-2 text-white/70 hover:bg-white/10"
          >
            <Globe size={16} />
            Ver site
          </Link>
          <p className="mb-2 truncate px-3 text-white/60">{admin?.email}</p>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded px-3 py-2 text-white/70 hover:bg-white/10"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </aside>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
