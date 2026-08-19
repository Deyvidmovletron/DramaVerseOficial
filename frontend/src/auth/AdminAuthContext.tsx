import axios from "axios";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";

import { adminApi } from "@/api/adminApi";
import { setAccessToken } from "@/lib/tokenStorage";

export interface AdminUser {
  id: number;
  nome: string;
  email: string;
}

interface AdminAuthContextValue {
  admin: AdminUser | null;
  isLoading: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await adminApi.get<AdminUser>("/auth/admin/me");
      setAdmin(data);
    } catch {
      setAdmin(null);
    }
  }, []);

  const bootstrap = useCallback(async () => {
    try {
      const { data } = await axios.post("/api/v1/auth/admin/refresh", {}, { withCredentials: true });
      setAccessToken("admin", data.access_token);
      await fetchMe();
    } catch {
      setAccessToken("admin", null);
      setAdmin(null);
    } finally {
      setIsLoading(false);
    }
  }, [fetchMe]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  async function login(email: string, senha: string): Promise<void> {
    const { data } = await adminApi.post("/auth/admin/login", { email, senha });
    setAccessToken("admin", data.access_token);
    await fetchMe();
  }

  function logout(): void {
    void adminApi.post("/auth/admin/logout").catch(() => {});
    setAccessToken("admin", null);
    setAdmin(null);
  }

  return (
    <AdminAuthContext.Provider value={{ admin, isLoading, login, logout }}>{children}</AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth deve ser usado dentro de AdminAuthProvider");
  return ctx;
}
