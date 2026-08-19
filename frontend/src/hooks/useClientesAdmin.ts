import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { adminApi } from "@/api/adminApi";
import type {
  AssinaturaAdmin,
  AssinaturaUpdateInput,
  ClienteAdmin,
  ClienteCreateInput,
  ClienteUpdateInput,
  Paginado,
} from "@/types/admin";

interface ClienteFiltros {
  busca?: string;
  page?: number;
  page_size?: number;
}

export function useClientesAdmin(filtros: ClienteFiltros = {}) {
  return useQuery({
    queryKey: ["admin-clientes", filtros],
    queryFn: async () => (await adminApi.get<Paginado<ClienteAdmin>>("/admin/clientes", { params: filtros })).data,
  });
}

export function useCreateClienteAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: ClienteCreateInput) => (await adminApi.post<ClienteAdmin>("/admin/clientes", data)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-clientes"] }),
  });
}

export function useUpdateClienteAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ClienteUpdateInput }) =>
      (await adminApi.put<ClienteAdmin>(`/admin/clientes/${id}`, data)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-clientes"] }),
  });
}

export function useDeleteClienteAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await adminApi.delete(`/admin/clientes/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-clientes"] }),
  });
}

export function useAtribuirAssinatura() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, plano_id }: { id: number; plano_id: number }) =>
      (await adminApi.post<ClienteAdmin>(`/admin/clientes/${id}/assinatura`, { plano_id })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-clientes"] });
      qc.invalidateQueries({ queryKey: ["admin-assinaturas"] });
    },
  });
}

// Cada cliente tem no máximo uma assinatura (nunca uma lista) — atribuir/editar sempre
// atualiza essa mesma, nunca cria outra.
export function useAssinaturaCliente(clienteId: number | null) {
  return useQuery({
    queryKey: ["admin-clientes", clienteId, "assinatura"],
    queryFn: async () =>
      (await adminApi.get<AssinaturaAdmin | null>(`/admin/clientes/${clienteId}/assinatura`)).data,
    enabled: clienteId !== null,
  });
}

export function useUpdateAssinaturaCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ clienteId, data }: { clienteId: number; data: AssinaturaUpdateInput }) =>
      (await adminApi.put<AssinaturaAdmin>(`/admin/clientes/${clienteId}/assinatura`, data)).data,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["admin-clientes", variables.clienteId, "assinatura"] });
      qc.invalidateQueries({ queryKey: ["admin-clientes"] });
      qc.invalidateQueries({ queryKey: ["admin-assinaturas"] });
    },
  });
}
