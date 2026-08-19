import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { adminApi } from "@/api/adminApi";
import type { Episodio, EpisodioUpdateInput } from "@/types/admin";

const EM_ANDAMENTO = new Set(["pendente", "baixando"]);

export function useEpisodios(serieId: number) {
  return useQuery({
    queryKey: ["episodios", serieId],
    queryFn: async () => (await adminApi.get<Episodio[]>(`/series/${serieId}/episodios`)).data,
    refetchInterval: (query) => {
      const dados = query.state.data as Episodio[] | undefined;
      return dados?.some((ep) => EM_ANDAMENTO.has(ep.status_processamento)) ? 3000 : false;
    },
  });
}

export function useAddEpisodioYoutube(serieId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      youtube_url,
      baixar,
      temporada_id,
    }: {
      youtube_url: string;
      baixar: boolean;
      temporada_id?: number | null;
    }) =>
      (
        await adminApi.post<Episodio>(`/series/${serieId}/episodios/youtube`, {
          youtube_url,
          baixar,
          temporada_id: temporada_id ?? null,
        })
      ).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["episodios", serieId] }),
  });
}

export function useBaixarEpisodio(serieId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await adminApi.post<Episodio>(`/episodios/${id}/baixar`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["episodios", serieId] }),
  });
}

interface AddLocalInput {
  titulo: string;
  descricao?: string | null;
  numero?: number | null;
  temporada_id?: number | null;
  arquivo: File;
  onProgress?: (percent: number) => void;
}

export function useAddEpisodioLocal(serieId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ titulo, descricao, numero, temporada_id, arquivo, onProgress }: AddLocalInput) => {
      const form = new FormData();
      form.append("titulo", titulo);
      if (descricao) form.append("descricao", descricao);
      if (numero !== undefined && numero !== null) form.append("numero", String(numero));
      if (temporada_id !== undefined && temporada_id !== null) form.append("temporada_id", String(temporada_id));
      form.append("arquivo", arquivo);
      return (
        await adminApi.post<Episodio>(`/series/${serieId}/episodios/local`, form, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (evt) => {
            if (onProgress && evt.total) {
              onProgress(Math.round((evt.loaded / evt.total) * 100));
            }
          },
        })
      ).data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["episodios", serieId] }),
  });
}

export function useUpdateEpisodio(serieId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: EpisodioUpdateInput }) =>
      (await adminApi.put<Episodio>(`/episodios/${id}`, data)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["episodios", serieId] }),
  });
}

export function useDeleteEpisodio(serieId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await adminApi.delete(`/episodios/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["episodios", serieId] }),
  });
}

export function useReordenarEpisodios(serieId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ordem: number[]) =>
      (await adminApi.put<Episodio[]>(`/series/${serieId}/episodios/reordenar`, { ordem })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["episodios", serieId] }),
  });
}
