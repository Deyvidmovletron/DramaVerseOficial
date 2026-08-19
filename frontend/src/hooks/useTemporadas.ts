import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { adminApi } from "@/api/adminApi";
import type { Temporada, TemporadaInput } from "@/types/admin";

export function useTemporadas(serieId: number) {
  return useQuery({
    queryKey: ["temporadas", serieId],
    queryFn: async () => (await adminApi.get<Temporada[]>(`/series/${serieId}/temporadas`)).data,
    enabled: Number.isFinite(serieId),
  });
}

export function useCreateTemporada(serieId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: TemporadaInput) =>
      (await adminApi.post<Temporada>(`/series/${serieId}/temporadas`, data)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["temporadas", serieId] }),
  });
}

export function useUpdateTemporada(serieId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: TemporadaInput }) =>
      (await adminApi.put<Temporada>(`/temporadas/${id}`, data)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["temporadas", serieId] }),
  });
}

export function useDeleteTemporada(serieId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await adminApi.delete(`/temporadas/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["temporadas", serieId] }),
  });
}
