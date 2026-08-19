import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { ProtectedAdminRoute } from "@/auth/ProtectedAdminRoute";
import { ProtectedClienteRoute } from "@/auth/ProtectedClienteRoute";
import { ProtectedClienteRouteLoggedIn } from "@/auth/ProtectedClienteRouteLoggedIn";
import { FullscreenLoader } from "@/components/ui/FullscreenLoader";
import { AdminLayout } from "@/layouts/AdminLayout";
import { ClienteLayout } from "@/layouts/ClienteLayout";
import { Categorias } from "@/pages/admin/Categorias";
import { Clientes } from "@/pages/admin/Clientes";
import { AdminDashboard } from "@/pages/admin/Dashboard";
import { EpisodiosManager } from "@/pages/admin/EpisodiosManager";
import { AdminEsqueciSenha } from "@/pages/admin/EsqueciSenha";
import { AdminLogin } from "@/pages/admin/Login";
import { Planos } from "@/pages/admin/Planos";
import { AdminRedefinirSenha } from "@/pages/admin/RedefinirSenha";
import { Series } from "@/pages/admin/Series";
import { SerieForm } from "@/pages/admin/SerieForm";
import { Assinaturas } from "@/pages/admin/Assinaturas";
import { Assinatura } from "@/pages/cliente/Assinatura";
import { AssinaturaBloqueada } from "@/pages/cliente/AssinaturaBloqueada";
import { AssinaturaCheckout } from "@/pages/cliente/AssinaturaCheckout";
import { Busca } from "@/pages/cliente/Busca";
import { EsqueciSenha } from "@/pages/cliente/EsqueciSenha";
import { Home } from "@/pages/cliente/Home";
import { Login } from "@/pages/cliente/Login";
import { MinhaConta } from "@/pages/cliente/MinhaConta";
import { MinhaLista } from "@/pages/cliente/MinhaLista";
import { RedefinirSenha } from "@/pages/cliente/RedefinirSenha";
import { SerieDetalhes } from "@/pages/cliente/SerieDetalhes";

// Carregado sob demanda: react-player traz suporte a HLS/DASH que não usamos,
// então isso evita inflar o bundle inicial do catálogo.
const Player = lazy(() => import("@/pages/cliente/Player").then((m) => ({ default: m.Player })));

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/esqueci-senha" element={<EsqueciSenha />} />
      <Route path="/redefinir-senha" element={<RedefinirSenha />} />
      <Route
        path="/assinatura/bloqueado"
        element={
          <ProtectedClienteRouteLoggedIn>
            <AssinaturaBloqueada />
          </ProtectedClienteRouteLoggedIn>
        }
      />
      <Route
        path="/assistir/:id"
        element={
          <ProtectedClienteRoute>
            <Suspense fallback={<FullscreenLoader />}>
              <Player />
            </Suspense>
          </ProtectedClienteRoute>
        }
      />

      {/* Rota sem path própria (só o layout) — não exige assinatura ativa, o cliente
          precisa acessar essas duas páginas mesmo bloqueado/expirado */}
      <Route
        element={
          <ProtectedClienteRouteLoggedIn>
            <ClienteLayout />
          </ProtectedClienteRouteLoggedIn>
        }
      >
        <Route path="assinatura" element={<Assinatura />} />
        <Route path="assinatura/checkout/:planoId" element={<AssinaturaCheckout />} />
        <Route path="minha-conta" element={<MinhaConta />} />
      </Route>

      <Route
        path="/"
        element={
          <ProtectedClienteRoute>
            <ClienteLayout />
          </ProtectedClienteRoute>
        }
      >
        <Route index element={<Home />} />
        <Route path="serie/:id" element={<SerieDetalhes />} />
        <Route path="buscar" element={<Busca />} />
        <Route path="minha-lista" element={<MinhaLista />} />
      </Route>

      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/esqueci-senha" element={<AdminEsqueciSenha />} />
      <Route path="/admin/redefinir-senha" element={<AdminRedefinirSenha />} />
      <Route
        path="/admin"
        element={
          <ProtectedAdminRoute>
            <AdminLayout />
          </ProtectedAdminRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="series" element={<Series />} />
        <Route path="series/novo" element={<SerieForm />} />
        <Route path="series/:id/editar" element={<SerieForm />} />
        <Route path="series/:id/episodios" element={<EpisodiosManager />} />
        <Route path="categorias" element={<Categorias />} />
        <Route path="planos" element={<Planos />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="assinaturas" element={<Assinaturas />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
