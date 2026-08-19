import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { clienteApi } from "@/api/clienteApi";
import type { SerieCard } from "@/types/catalogo";

export function useMinhaLista() {
  return useQuery({
    queryKey: ["catalogo", "minha-lista"],
    queryFn: async () => (await clienteApi.get<SerieCard[]>("/catalogo/minha-lista")).data,
  });
}

export function useAdicionarMinhaLista() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (serieId: number) => {
      await clienteApi.post(`/catalogo/minha-lista/${serieId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalogo"] }),
  });
}

export function useRemoverMinhaLista() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (serieId: number) => {
      await clienteApi.delete(`/catalogo/minha-lista/${serieId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalogo"] }),
  });
}
