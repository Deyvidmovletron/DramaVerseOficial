import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { adminApi } from "@/api/adminApi";
import type { Plano, PlanoInput } from "@/types/admin";

export function usePlanos() {
  return useQuery({
    queryKey: ["planos"],
    queryFn: async () => (await adminApi.get<Plano[]>("/planos")).data,
  });
}

export function useCreatePlano() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: PlanoInput) => (await adminApi.post<Plano>("/planos", data)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["planos"] }),
  });
}

export function useUpdatePlano() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: PlanoInput }) =>
      (await adminApi.put<Plano>(`/planos/${id}`, data)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["planos"] }),
  });
}

export function useDeletePlano() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await adminApi.delete(`/planos/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["planos"] }),
  });
}
