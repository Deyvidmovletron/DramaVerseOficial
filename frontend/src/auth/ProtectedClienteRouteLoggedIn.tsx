import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useClienteAuth } from "@/auth/ClienteAuthContext";
import { FullscreenLoader } from "@/components/ui/FullscreenLoader";

/** Exige apenas que o cliente esteja logado — não bloqueia por assinatura inativa.
 * Usado nas páginas de assinatura/checkout, onde exigir uma assinatura ativa criaria um loop. */
export function ProtectedClienteRouteLoggedIn({ children }: { children: ReactNode }) {
  const { cliente, isLoading } = useClienteAuth();
  const location = useLocation();

  if (isLoading) return <FullscreenLoader />;
  if (!cliente) return <Navigate to="/login" state={{ from: location }} replace />;

  return <>{children}</>;
}
