import { useMutation, useQueryClient } from "@tanstack/react-query";

import { adminApi } from "@/api/adminApi";
import type { ImportacaoPlaylist, PlaylistPreview } from "@/types/admin";

export function usePlaylistPreview(serieId: number) {
  return useMutation({
    mutationFn: async (playlist_url: string) =>
      (await adminApi.post<PlaylistPreview>(`/series/${serieId}/playlist/preview`, { playlist_url })).data,
  });
}

interface ImportarInput {
  playlist_url: string;
  video_ids: string[];
  baixar: boolean;
  temporada_id: number | null;
}

export function useImportarPlaylist(serieId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ playlist_url, video_ids, baixar, temporada_id }: ImportarInput) =>
      (
        await adminApi.post<ImportacaoPlaylist>(`/series/${serieId}/playlist/importar`, {
          playlist_url,
          video_ids,
          baixar,
          temporada_id,
        })
      ).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["episodios", serieId] }),
  });
}
