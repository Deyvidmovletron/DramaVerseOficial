import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { adminApi } from "@/api/adminApi";
import type { AssinaturaAdmin, AssinaturaCreateInput, AssinaturaUpdateInput, Paginado } from "@/types/admin";

interface AssinaturaFiltros {
  busca?: string;
  status?: string;
  page?: number;
  page_size?: number;
}

export function useAssinaturasAdmin(filtros: AssinaturaFiltros = {}) {
  return useQuery({
    queryKey: ["admin-assinaturas", filtros],
    queryFn: async () => (await adminApi.get<Paginado<AssinaturaAdmin>>("/admin/assinaturas", { params: filtros })).data,
  });
}

export function useCreateAssinaturaAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: AssinaturaCreateInput) =>
      (await adminApi.post<AssinaturaAdmin>("/admin/assinaturas", data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-assinaturas"] });
      qc.invalidateQueries({ queryKey: ["admin-clientes"] });
    },
  });
}

export function useUpdateAssinaturaAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: AssinaturaUpdateInput }) =>
      (await adminApi.put<AssinaturaAdmin>(`/admin/assinaturas/${id}`, data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-assinaturas"] });
      qc.invalidateQueries({ queryKey: ["admin-clientes"] });
    },
  });
}

export function useDeleteAssinaturaAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await adminApi.delete(`/admin/assinaturas/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-assinaturas"] });
      qc.invalidateQueries({ queryKey: ["admin-clientes"] });
    },
  });
}
