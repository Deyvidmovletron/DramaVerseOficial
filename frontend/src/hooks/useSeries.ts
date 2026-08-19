import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { adminApi } from "@/api/adminApi";
import type { Paginado, Serie, SerieInput } from "@/types/admin";

interface SerieFiltros {
  categoria_id?: number;
  status_serie?: string;
  busca?: string;
  page?: number;
  page_size?: number;
}

export function useSeries(filtros: SerieFiltros = {}) {
  return useQuery({
    queryKey: ["series", filtros],
    queryFn: async () => (await adminApi.get<Paginado<Serie>>("/series", { params: filtros })).data,
  });
}

export function useSerie(id: number | undefined) {
  return useQuery({
    queryKey: ["serie", id],
    queryFn: async () => (await adminApi.get<Serie>(`/series/${id}`)).data,
    enabled: id !== undefined,
  });
}

export function useCreateSerie() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: SerieInput) => (await adminApi.post<Serie>("/series", data)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["series"] }),
  });
}

export function useUpdateSerie() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: SerieInput }) =>
      (await adminApi.put<Serie>(`/series/${id}`, data)).data,
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["series"] });
      qc.invalidateQueries({ queryKey: ["serie", vars.id] });
    },
  });
}

export function useDeleteSerie() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await adminApi.delete(`/series/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["series"] }),
  });
}

export function useUploadImagemSerie(tipo: "capa" | "banner") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, arquivo }: { id: number; arquivo: File }) => {
      const form = new FormData();
      form.append("arquivo", arquivo);
      return (
        await adminApi.post<Serie>(`/series/${id}/${tipo}`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        })
      ).data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["series"] });
      qc.invalidateQueries({ queryKey: ["serie", vars.id] });
    },
  });
}
