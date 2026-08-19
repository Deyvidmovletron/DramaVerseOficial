import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { adminApi } from "@/api/adminApi";
import type { Categoria } from "@/types/admin";

export function useCategorias() {
  return useQuery({
    queryKey: ["categorias"],
    queryFn: async () => (await adminApi.get<Categoria[]>("/categorias")).data,
  });
}

export function useCreateCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (nome: string) => (await adminApi.post<Categoria>("/categorias", { nome })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categorias"] }),
  });
}

export function useUpdateCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, nome }: { id: number; nome: string }) =>
      (await adminApi.put<Categoria>(`/categorias/${id}`, { nome })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categorias"] }),
  });
}

export function useDeleteCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await adminApi.delete(`/categorias/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categorias"] }),
  });
}
