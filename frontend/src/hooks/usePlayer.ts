import { useMutation, useQuery } from "@tanstack/react-query";

import { clienteApi } from "@/api/clienteApi";
import type { EpisodioPlayer } from "@/types/catalogo";

export function useEpisodioPlayer(id: number) {
  return useQuery({
    queryKey: ["catalogo", "episodio", id],
    queryFn: async () => (await clienteApi.get<EpisodioPlayer>(`/catalogo/episodios/${id}`)).data,
  });
}

interface ProgressoInput {
  episodio_id: number;
  segundos_assistidos: number;
  concluido: boolean;
}

export function useSalvarProgresso() {
  return useMutation({
    mutationFn: async (data: ProgressoInput) => {
      await clienteApi.post("/catalogo/progresso", data);
    },
  });
}
