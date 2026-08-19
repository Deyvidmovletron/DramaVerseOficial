import { ListVideo } from "lucide-react";
import { type FormEvent, useState } from "react";

import { useImportarPlaylist, usePlaylistPreview } from "@/hooks/usePlaylist";
import { useTemporadas } from "@/hooks/useTemporadas";
import type { Temporada } from "@/types/admin";

function formatarDuracao(segundos: number | null): string {
  if (!segundos) return "-";
  const min = Math.floor(segundos / 60);
  const seg = segundos % 60;
  return `${min}:${seg.toString().padStart(2, "0")}`;
}

function temporadaLabel(temporada: Temporada): string {
  return temporada.titulo ? `Temporada ${temporada.numero} — ${temporada.titulo}` : `Temporada ${temporada.numero}`;
}

export function PlaylistImportForm({ serieId, serieTemCapa }: { serieId: number; serieTemCapa: boolean }) {
  const preview = usePlaylistPreview(serieId);
  const importar = useImportarPlaylist(serieId);
  const { data: temporadas } = useTemporadas(serieId);

  const [url, setUrl] = useState("");
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [baixar, setBaixar] = useState(false);
  const [temporadaId, setTemporadaId] = useState<string>("");
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);

  async function handleBuscar(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setResultado(null);
    try {
      const dados = await preview.mutateAsync(url.trim());
      setSelecionados(new Set(dados.videos.filter((v) => !v.ja_importado).map((v) => v.video_id)));
    } catch {
      setErro("Não foi possível ler essa playlist. Verifique o link.");
    }
  }

  function alternarSelecao(videoId: string) {
    setSelecionados((atual) => {
      const nova = new Set(atual);
      if (nova.has(videoId)) nova.delete(videoId);
      else nova.add(videoId);
      return nova;
    });
  }

  async function handleImportar() {
    if (!preview.data) return;
    setErro(null);
    let res;
    try {
      res = await importar.mutateAsync({
        playlist_url: preview.data.playlist_url,
        video_ids: Array.from(selecionados),
        baixar,
        temporada_id: temporadaId ? Number(temporadaId) : null,
      });
    } catch {
      setErro("Falha ao importar os vídeos selecionados.");
      return;
    }

    setResultado(
      `${res.total_importados} episódio(s) importado(s) com sucesso.` +
        (baixar ? " O download dos vídeos foi iniciado em segundo plano." : ""),
    );

    // Mantém o link no campo e atualiza a lista (marcando os recém-importados) — assim o
    // admin consegue importar o restante da playlist depois sem precisar colar o link de novo.
    try {
      const atualizado = await preview.mutateAsync(url.trim());
      setSelecionados(new Set(atualizado.videos.filter((v) => !v.ja_importado).map((v) => v.video_id)));
    } catch {
      // Import já concluiu com sucesso; só não deu pra atualizar a prévia agora.
    }
  }

  return (
    <div className="mb-8 rounded border border-white/10 p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white/80">
        <ListVideo size={16} />
        Importar playlist do YouTube
      </h2>

      <form onSubmit={handleBuscar} className="mb-3 flex gap-2">
        <input
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.youtube.com/playlist?list=..."
          className="flex-1 rounded border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-brand"
        />
        <button
          type="submit"
          disabled={preview.isPending}
          className="shrink-0 rounded bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20 disabled:opacity-60"
        >
          {preview.isPending ? "Buscando..." : "Buscar vídeos"}
        </button>
      </form>

      {erro && <p className="mb-3 text-xs text-red-300">{erro}</p>}
      {resultado && <p className="mb-3 text-xs text-green-300">{resultado}</p>}

      {preview.data && (
        <div>
          {preview.data.playlist_thumbnail_url && (
            <div className="mb-3 flex items-center gap-3 rounded border border-white/10 bg-black/20 p-2">
              <div className="h-12 w-20 shrink-0 overflow-hidden rounded bg-white/10">
                <img
                  src={preview.data.playlist_thumbnail_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 text-xs">
                <p className="truncate text-white/70">{preview.data.playlist_titulo ?? "Capa da playlist"}</p>
                <p className="text-white/40">
                  {serieTemCapa
                    ? "A série já tem capa definida, essa imagem não será usada."
                    : "Será usada como capa e banner da série ao importar."}
                </p>
              </div>
            </div>
          )}

          <p className="mb-2 text-xs text-white/50">
            {preview.data.total_encontrados} vídeo(s) encontrado(s) · {selecionados.size} selecionado(s)
          </p>

          <div className="mb-3 max-h-72 divide-y divide-white/10 overflow-y-auto rounded border border-white/10">
            {preview.data.videos.map((video) => (
              <label
                key={video.video_id}
                className={`flex items-center gap-3 px-3 py-2 text-sm ${
                  video.ja_importado ? "opacity-40" : "cursor-pointer hover:bg-white/5"
                }`}
              >
                <input
                  type="checkbox"
                  disabled={video.ja_importado}
                  checked={selecionados.has(video.video_id)}
                  onChange={() => alternarSelecao(video.video_id)}
                />
                <div className="h-10 w-16 shrink-0 overflow-hidden rounded bg-white/10">
                  {video.thumbnail_url && (
                    <img src={video.thumbnail_url} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <span className="min-w-0 flex-1 truncate">{video.titulo}</span>
                <span className="shrink-0 text-xs text-white/50">
                  {video.ja_importado ? "já importado" : formatarDuracao(video.duracao_segundos)}
                </span>
              </label>
            ))}
          </div>

          {temporadas && temporadas.length > 0 && (
            <select
              value={temporadaId}
              onChange={(e) => setTemporadaId(e.target.value)}
              className="mb-3 w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-brand"
            >
              <option value="">Sem temporada</option>
              {temporadas.map((t) => (
                <option key={t.id} value={t.id}>
                  {temporadaLabel(t)}
                </option>
              ))}
            </select>
          )}

          <label className="mb-3 flex items-center gap-2 text-xs text-white/70">
            <input type="checkbox" checked={baixar} onChange={(e) => setBaixar(e.target.checked)} />
            Baixar os vídeos para o servidor (em vez de apenas linkar o player do YouTube)
          </label>

          <button
            onClick={handleImportar}
            disabled={importar.isPending || selecionados.size === 0}
            className="rounded bg-brand px-4 py-2 text-sm font-semibold hover:bg-brand-dark disabled:opacity-60"
          >
            {importar.isPending ? "Importando..." : `Importar ${selecionados.size} selecionado(s)`}
          </button>
        </div>
      )}
    </div>
  );
}
