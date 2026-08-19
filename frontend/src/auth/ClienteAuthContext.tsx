import axios from "axios";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";

import { clienteApi } from "@/api/clienteApi";
import { setAccessToken } from "@/lib/tokenStorage";

interface AssinaturaResumo {
  ativa: boolean;
  status: string | null;
  data_expiracao: string | null;
}

export interface ClienteUser {
  id: number;
  nome: string;
  email: string;
  status: "ativo" | "bloqueado";
  assinatura: AssinaturaResumo;
}

interface ClienteAuthContextValue {
  cliente: ClienteUser | null;
  isLoading: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => void;
  refetch: () => Promise<void>;
}

const ClienteAuthContext = createContext<ClienteAuthContextValue | undefined>(undefined);

export function ClienteAuthProvider({ children }: { children: ReactNode }) {
  const [cliente, setCliente] = useState<ClienteUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await clienteApi.get<ClienteUser>("/auth/cliente/me");
      setCliente(data);
    } catch {
      setCliente(null);
    }
  }, []);

  // Bootstrap ao carregar a página: o access token vive só em memória (não sobrevive a um
  // reload), então tenta renovar via cookie httpOnly antes de decidir se há sessão ativa.
  const bootstrap = useCallback(async () => {
    try {
      const { data } = await axios.post("/api/v1/auth/cliente/refresh", {}, { withCredentials: true });
      setAccessToken("cliente", data.access_token);
      await fetchMe();
    } catch {
      setAccessToken("cliente", null);
      setCliente(null);
    } finally {
      setIsLoading(false);
    }
  }, [fetchMe]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  async function login(email: string, senha: string): Promise<void> {
    const { data } = await clienteApi.post("/auth/cliente/login", { email, senha });
    setAccessToken("cliente", data.access_token);
    await fetchMe();
  }

  function logout(): void {
    // Melhor-esforço: invalida a sessão no servidor (token_version + limpa o cookie), mas o
    // logout local acontece de qualquer forma, mesmo se a chamada falhar.
    void clienteApi.post("/auth/cliente/logout").catch(() => {});
    setAccessToken("cliente", null);
    setCliente(null);
  }

  return (
    <ClienteAuthContext.Provider value={{ cliente, isLoading, login, logout, refetch: fetchMe }}>
      {children}
    </ClienteAuthContext.Provider>
  );
}

export function useClienteAuth(): ClienteAuthContextValue {
  const ctx = useContext(ClienteAuthContext);
  if (!ctx) throw new Error("useClienteAuth deve ser usado dentro de ClienteAuthProvider");
  return ctx;
}
