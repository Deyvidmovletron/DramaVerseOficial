import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAdminAuth } from "@/auth/AdminAuthContext";
import { useClienteAuth } from "@/auth/ClienteAuthContext";
import { FullscreenLoader } from "@/components/ui/FullscreenLoader";

export function ProtectedClienteRoute({ children }: { children: ReactNode }) {
  const { cliente, isLoading: isLoadingCliente } = useClienteAuth();
  const { admin, isLoading: isLoadingAdmin } = useAdminAuth();
  const location = useLocation();

  if (isLoadingCliente || isLoadingAdmin) return <FullscreenLoader />;

  // Admin logado navega pelas áreas comuns do site sem precisar de conta de cliente
  // nem assinatura ativa.
  if (admin) return <>{children}</>;

  if (!cliente) return <Navigate to="/login" state={{ from: location }} replace />;
  if (cliente.status === "bloqueado" || !cliente.assinatura.ativa) {
    return <Navigate to="/assinatura/bloqueado" replace />;
  }

  return <>{children}</>;
}
