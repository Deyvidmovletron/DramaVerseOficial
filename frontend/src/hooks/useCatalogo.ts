import { useQuery } from "@tanstack/react-query";

import { clienteApi } from "@/api/clienteApi";
import type { Categoria, Home, SerieCard, SerieDetalhe } from "@/types/catalogo";

export function useHome() {
  return useQuery({
    queryKey: ["catalogo", "home"],
    queryFn: async () => (await clienteApi.get<Home>("/catalogo/home")).data,
  });
}

export function useSerieDetalhe(id: number) {
  return useQuery({
    queryKey: ["catalogo", "serie", id],
    queryFn: async () => (await clienteApi.get<SerieDetalhe>(`/catalogo/series/${id}`)).data,
  });
}

export function useCategoriasCatalogo() {
  return useQuery({
    queryKey: ["catalogo", "categorias"],
    queryFn: async () => (await clienteApi.get<Categoria[]>("/catalogo/categorias")).data,
  });
}

export function useBusca(q: string, categoriaId: number | null) {
  return useQuery({
    queryKey: ["catalogo", "busca", q, categoriaId],
    queryFn: async () =>
      (
        await clienteApi.get<SerieCard[]>("/catalogo/busca", {
          params: { q: q || undefined, categoria_id: categoriaId ?? undefined },
        })
      ).data,
    enabled: q.trim().length > 0 || categoriaId !== null,
  });
}
