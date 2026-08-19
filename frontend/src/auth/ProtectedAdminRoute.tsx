import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAdminAuth } from "@/auth/AdminAuthContext";
import { FullscreenLoader } from "@/components/ui/FullscreenLoader";

export function ProtectedAdminRoute({ children }: { children: ReactNode }) {
  const { admin, isLoading } = useAdminAuth();
  const location = useLocation();

  if (isLoading) return <FullscreenLoader />;
  if (!admin) return <Navigate to="/admin/login" state={{ from: location }} replace />;

  return <>{children}</>;
}
