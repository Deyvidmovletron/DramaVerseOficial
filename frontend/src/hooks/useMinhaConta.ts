import { useMutation } from "@tanstack/react-query";

import { clienteApi } from "@/api/clienteApi";
import { setAccessToken } from "@/lib/tokenStorage";

interface AtualizarPerfilInput {
  nome: string;
  email: string;
}

export function useAtualizarPerfil() {
  return useMutation({
    mutationFn: async (data: AtualizarPerfilInput) => {
      await clienteApi.put("/auth/cliente/perfil", data);
    },
  });
}

interface TrocarSenhaInput {
  senha_atual: string;
  nova_senha: string;
}

export function useTrocarSenha() {
  return useMutation({
    mutationFn: async (data: TrocarSenhaInput) => {
      const { data: tokens } = await clienteApi.post("/auth/cliente/trocar-senha", data);
      // A troca de senha reemite o access token (a sessão atual continua válida; as demais
      // sessões/dispositivos são derrubados no servidor).
      setAccessToken("cliente", tokens.access_token);
    },
  });
}

export function useLogoutTodosDispositivos() {
  return useMutation({
    mutationFn: async () => {
      await clienteApi.post("/auth/cliente/logout-todos");
    },
  });
}
