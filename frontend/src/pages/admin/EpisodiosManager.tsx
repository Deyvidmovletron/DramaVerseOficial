import {
  AlertCircle,
  CheckCircle2,
  Download,
  GripVertical,
  Layers,
  Link2,
  Loader2,
  Pencil,
  Plus,
  RotateCw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { type DragEvent, type FormEvent, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { PlaylistImportForm } from "@/components/admin/PlaylistImportForm";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import {
  useAddEpisodioLocal,
  useAddEpisodioYoutube,
  useBaixarEpisodio,
  useDeleteEpisodio,
  useEpisodios,
  useReordenarEpisodios,
  useUpdateEpisodio,
} from "@/hooks/useEpisodios";
import { useSerie } from "@/hooks/useSeries";
import { useCreateTemporada, useDeleteTemporada, useTemporadas, useUpdateTemporada } from "@/hooks/useTemporadas";
import type { Episodio, Temporada } from "@/types/admin";

function formatarDuracao(segundos: number | null): string {
  if (!segundos) return "-";
  const min = Math.floor(segundos / 60);
  const seg = segundos % 60;
  return `${min}:${seg.toString().padStart(2, "0")}`;
}

function fonteLabel(fonte: Episodio["fonte"]): string {
  switch (fonte) {
    case "youtube_embed":
      return "YouTube (link)";
    case "youtube_baixado":
      return "YouTube (baixado)";
    case "local":
      return "Upload local";
    case "panda":
      return "Panda Video";
  }
}

function tituloDoArquivo(nomeArquivo: string): string {
  const semExtensao = nomeArquivo.replace(/\.[^/.]+$/, "");
  return semExtensao.replace(/[_.]+/g, " ").trim();
}

function temporadaLabel(temporada: Temporada): string {
  return temporada.titulo ? `Temporada ${temporada.numero} — ${temporada.titulo}` : `Temporada ${temporada.numero}`;
}

type StatusFila = "pendente" | "enviando" | "concluido" | "erro";

interface ItemFila {
  id: string;
  arquivo: File;
  titulo: string;
  numero: number | null;
  temporada_id: number | null;
  status: StatusFila;
  progresso: number;
  erro?: string;
}

export function EpisodiosManager() {
  const { id } = useParams<{ id: string }>();
  const serieId = Number(id);

  const { data: serie } = useSerie(serieId);
  const { data: episodios } = useEpisodios(serieId);
  const { data: temporadas } = useTemporadas(serieId);
  const addYoutube = useAddEpisodioYoutube(serieId);
  const addLocal = useAddEpisodioLocal(serieId);
  const atualizar = useUpdateEpisodio(serieId);
  const excluir = useDeleteEpisodio(serieId);
  const reordenar = useReordenarEpisodios(serieId);
  const baixar = useBaixarEpisodio(serieId);
  const criarTemporada = useCreateTemporada(serieId);
  const atualizarTemporada = useUpdateTemporada(serieId);
  const excluirTemporada = useDeleteTemporada(serieId);
  const { confirmar } = useConfirm();

  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [baixarYoutube, setBaixarYoutube] = useState(false);
  const [temporadaYoutube, setTemporadaYoutube] = useState<string>("");
  const [erroYoutube, setErroYoutube] = useState<string | null>(null);

  const [filaLocal, setFilaLocal] = useState<ItemFila[]>([]);
  const [arrastandoArquivo, setArrastandoArquivo] = useState(false);
  const [enviandoFila, setEnviandoFila] = useState(false);
  const inputArquivoRef = useRef<HTMLInputElement>(null);

  const [novaTemporadaNumero, setNovaTemporadaNumero] = useState("");
  const [novaTemporadaTitulo, setNovaTemporadaTitulo] = useState("");
  const [erroTemporada, setErroTemporada] = useState<string | null>(null);
  const [editandoTemporadaId, setEditandoTemporadaId] = useState<number | null>(null);
  const [temporadaEdicaoTitulo, setTemporadaEdicaoTitulo] = useState("");

  const [filtroTemporada, setFiltroTemporada] = useState<string>("todas");

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [tituloEdicao, setTituloEdicao] = useState("");
  const [numeroEdicao, setNumeroEdicao] = useState<string>("");
  const [temporadaEdicaoEpisodio, setTemporadaEdicaoEpisodio] = useState<string>("");

  const [lista, setLista] = useState<Episodio[]>([]);
  const [arrastandoId, setArrastandoId] = useState<number | null>(null);

  useEffect(() => {
    if (episodios) setLista(episodios);
  }, [episodios]);

  async function handleAddYoutube(event: FormEvent) {
    event.preventDefault();
    setErroYoutube(null);
    try {
      await addYoutube.mutateAsync({
        youtube_url: youtubeUrl.trim(),
        baixar: baixarYoutube,
        temporada_id: temporadaYoutube ? Number(temporadaYoutube) : null,
      });
      setYoutubeUrl("");
    } catch {
      setErroYoutube("Não foi possível obter esse vídeo do YouTube. Verifique o link.");
    }
  }

  async function handleBaixar(ep: Episodio) {
    await baixar.mutateAsync(ep.id);
  }

  function proximoNumeroSugerido(quantosJaNaFila: number): number {
    const maiorAtual = lista.reduce((max, ep) => (ep.numero !== null && ep.numero > max ? ep.numero : max), 0);
    return maiorAtual + quantosJaNaFila + 1;
  }

  function adicionarArquivosNaFila(arquivos: FileList | File[]) {
    const arquivosVideo = Array.from(arquivos).filter((f) => f.type.startsWith("video/") || f.type === "");
    if (arquivosVideo.length === 0) return;

    setFilaLocal((atual) => {
      const temporadaPadrao = filtroTemporada !== "todas" && filtroTemporada !== "sem" ? Number(filtroTemporada) : null;
      const novos: ItemFila[] = arquivosVideo.map((arquivo, idx) => ({
        id: `${Date.now()}-${idx}-${arquivo.name}`,
        arquivo,
        titulo: tituloDoArquivo(arquivo.name),
        numero: proximoNumeroSugerido(atual.length + idx),
        temporada_id: temporadaPadrao,
        status: "pendente",
        progresso: 0,
      }));
      return [...atual, ...novos];
    });
  }

  function handleSelecionarArquivos(event: React.ChangeEvent<HTMLInputElement>) {
    if (event.target.files) adicionarArquivosNaFila(event.target.files);
    event.target.value = "";
  }

  function handleDropArquivos(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setArrastandoArquivo(false);
    if (event.dataTransfer.files) adicionarArquivosNaFila(event.dataTransfer.files);
  }

  function atualizarItemFila(id: string, patch: Partial<ItemFila>) {
    setFilaLocal((atual) => atual.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removerItemFila(id: string) {
    setFilaLocal((atual) => atual.filter((item) => item.id !== id));
  }

  async function handleEnviarFila() {
    setEnviandoFila(true);
    const pendentes = filaLocal.filter((item) => item.status === "pendente" || item.status === "erro");
    for (const item of pendentes) {
      atualizarItemFila(item.id, { status: "enviando", progresso: 0, erro: undefined });
      try {
        await addLocal.mutateAsync({
          titulo: item.titulo,
          numero: item.numero,
          temporada_id: item.temporada_id,
          arquivo: item.arquivo,
          onProgress: (percent) => atualizarItemFila(item.id, { progresso: percent }),
        });
        atualizarItemFila(item.id, { status: "concluido", progresso: 100 });
      } catch {
        atualizarItemFila(item.id, { status: "erro", erro: "Falha ao enviar este vídeo." });
      }
    }
    setEnviandoFila(false);
  }

  function handleLimparConcluidos() {
    setFilaLocal((atual) => atual.filter((item) => item.status !== "concluido"));
  }

  async function handleCriarTemporada(event: FormEvent) {
    event.preventDefault();
    setErroTemporada(null);
    const numero = Number(novaTemporadaNumero);
    if (!numero || numero < 1) {
      setErroTemporada("Informe um número de temporada válido.");
      return;
    }
    try {
      await criarTemporada.mutateAsync({ numero, titulo: novaTemporadaTitulo.trim() || null });
      setNovaTemporadaNumero("");
      setNovaTemporadaTitulo("");
    } catch {
      setErroTemporada("Não foi possível criar a temporada (número já existe?).");
    }
  }

  function iniciarEdicaoTemporada(t: Temporada) {
    setEditandoTemporadaId(t.id);
    setTemporadaEdicaoTitulo(t.titulo ?? "");
  }

  async function salvarEdicaoTemporada(t: Temporada) {
    await atualizarTemporada.mutateAsync({ id: t.id, data: { numero: t.numero, titulo: temporadaEdicaoTitulo.trim() || null } });
    setEditandoTemporadaId(null);
  }

  async function handleExcluirTemporada(t: Temporada) {
    const ok = await confirmar({
      message: `Excluir ${temporadaLabel(t)}? Os episódios não serão excluídos, só perderão o vínculo.`,
      danger: true,
      confirmLabel: "Excluir",
    });
    if (!ok) return;
    await excluirTemporada.mutateAsync(t.id);
  }

  function iniciarEdicao(ep: Episodio) {
    setEditandoId(ep.id);
    setTituloEdicao(ep.titulo);
    setNumeroEdicao(ep.numero?.toString() ?? "");
    setTemporadaEdicaoEpisodio(ep.temporada_id?.toString() ?? "");
  }

  async function salvarEdicao(ep: Episodio) {
    await atualizar.mutateAsync({
      id: ep.id,
      data: {
        titulo: tituloEdicao,
        descricao: ep.descricao,
        numero: numeroEdicao ? Number(numeroEdicao) : null,
        temporada_id: temporadaEdicaoEpisodio ? Number(temporadaEdicaoEpisodio) : null,
      },
    });
    setEditandoId(null);
  }

  async function handleExcluir(ep: Episodio) {
    const ok = await confirmar({ message: `Excluir o episódio "${ep.titulo}"?`, danger: true, confirmLabel: "Excluir" });
    if (!ok) return;
    await excluir.mutateAsync(ep.id);
  }

  function handleDragStart(id: number) {
    setArrastandoId(id);
  }

  function handleDragOver(event: DragEvent, sobreId: number) {
    event.preventDefault();
    if (arrastandoId === null || arrastandoId === sobreId) return;

    setLista((atual) => {
      const origemIdx = atual.findIndex((e) => e.id === arrastandoId);
      const destinoIdx = atual.findIndex((e) => e.id === sobreId);
      if (origemIdx === -1 || destinoIdx === -1) return atual;
      const nova = [...atual];
      const [item] = nova.splice(origemIdx, 1);
      nova.splice(destinoIdx, 0, item);
      return nova;
    });
  }

  function handleDrop() {
    if (arrastandoId === null) return;
    setArrastandoId(null);
    reordenar.mutate(lista.map((e) => e.id));
  }

  const listaFiltrada = lista.filter((ep) => {
    if (filtroTemporada === "todas") return true;
    if (filtroTemporada === "sem") return ep.temporada_id === null;
    return ep.temporada_id === Number(filtroTemporada);
  });

  const haFilaPendente = filaLocal.some((item) => item.status === "pendente" || item.status === "erro");
  const haFilaConcluida = filaLocal.some((item) => item.status === "concluido");

  return (
    <div className="max-w-4xl">
      <Link to="/admin/series" className="mb-2 inline-block text-sm text-white/50 hover:text-white">
        ← Voltar para séries
      </Link>
      <h1 className="mb-6 text-2xl font-semibold">Episódios — {serie?.titulo}</h1>

      {/* Temporadas */}
      <div className="mb-8 rounded border border-white/10 p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white/80">
          <Layers size={16} />
          Temporadas
        </h2>

        {temporadas && temporadas.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {temporadas.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-2 rounded border border-white/10 bg-black/30 px-3 py-1.5 text-sm"
              >
                {editandoTemporadaId === t.id ? (
                  <>
                    <span className="text-white/50">T{t.numero}</span>
                    <input
                      autoFocus
                      value={temporadaEdicaoTitulo}
                      onChange={(e) => setTemporadaEdicaoTitulo(e.target.value)}
                      placeholder="Título (opcional)"
                      className="w-32 rounded border border-white/20 bg-black/40 px-2 py-0.5 text-xs outline-none"
                    />
                    <button
                      onClick={() => salvarEdicaoTemporada(t)}
                      className="text-xs font-semibold text-brand hover:underline"
                    >
                      Salvar
                    </button>
                  </>
                ) : (
                  <>
                    <span>{temporadaLabel(t)}</span>
                    <button onClick={() => iniciarEdicaoTemporada(t)} className="text-white/40 hover:text-white">
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => handleExcluirTemporada(t)} className="text-white/40 hover:text-red-400">
                      <Trash2 size={12} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleCriarTemporada} className="flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-xs text-white/60">Número</label>
            <input
              type="number"
              min={1}
              value={novaTemporadaNumero}
              onChange={(e) => setNovaTemporadaNumero(e.target.value)}
              className="w-20 rounded border border-white/10 bg-black/30 px-2 py-1.5 text-sm outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/60">Título (opcional)</label>
            <input
              value={novaTemporadaTitulo}
              onChange={(e) => setNovaTemporadaTitulo(e.target.value)}
              placeholder="Ex: Parte 2"
              className="w-40 rounded border border-white/10 bg-black/30 px-2 py-1.5 text-sm outline-none focus:border-brand"
            />
          </div>
          <button
            type="submit"
            disabled={criarTemporada.isPending}
            className="flex items-center gap-1 rounded bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/20 disabled:opacity-60"
          >
            <Plus size={14} />
            Nova temporada
          </button>
        </form>
        {erroTemporada && <p className="mt-2 text-xs text-red-300">{erroTemporada}</p>}
      </div>

      <PlaylistImportForm serieId={serieId} serieTemCapa={!!serie?.capa_url} />

      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <form onSubmit={handleAddYoutube} className="rounded border border-white/10 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white/80">
            <Link2 size={16} />
            Adicionar vídeo do YouTube
          </h2>
          <input
            required
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="mb-2 w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-brand"
          />
          {temporadas && temporadas.length > 0 && (
            <select
              value={temporadaYoutube}
              onChange={(e) => setTemporadaYoutube(e.target.value)}
              className="mb-2 w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-brand"
            >
              <option value="">Sem temporada</option>
              {temporadas.map((t) => (
                <option key={t.id} value={t.id}>
                  {temporadaLabel(t)}
                </option>
              ))}
            </select>
          )}
          <label className="mb-2 flex items-center gap-2 text-xs text-white/70">
            <input
              type="checkbox"
              checked={baixarYoutube}
              onChange={(e) => setBaixarYoutube(e.target.checked)}
            />
            Baixar o vídeo para o servidor (em vez de apenas linkar o player do YouTube)
          </label>
          {erroYoutube && <p className="mb-2 text-xs text-red-300">{erroYoutube}</p>}
          <button
            type="submit"
            disabled={addYoutube.isPending}
            className="rounded bg-brand px-4 py-2 text-sm font-semibold hover:bg-brand-dark disabled:opacity-60"
          >
            {addYoutube.isPending ? "Buscando..." : "Adicionar"}
          </button>
        </form>

        {/* Upload local em massa */}
        <div className="rounded border border-white/10 p-4">
          <h2 className="mb-3 text-sm font-semibold text-white/80">Upload de vídeos locais</h2>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setArrastandoArquivo(true);
            }}
            onDragLeave={() => setArrastandoArquivo(false)}
            onDrop={handleDropArquivos}
            onClick={() => inputArquivoRef.current?.click()}
            className={`mb-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded border-2 border-dashed px-4 py-6 text-center text-sm transition ${
              arrastandoArquivo ? "border-brand bg-brand/10" : "border-white/15 hover:border-white/30"
            }`}
          >
            <Upload size={20} className="text-white/50" />
            <p className="text-white/70">Arraste vídeos aqui ou clique para escolher</p>
            <p className="text-xs text-white/40">Pode selecionar vários arquivos de uma vez</p>
            <input
              ref={inputArquivoRef}
              type="file"
              accept="video/*"
              multiple
              onChange={handleSelecionarArquivos}
              className="hidden"
            />
          </div>

          {filaLocal.length > 0 && (
            <div className="mb-3 space-y-2">
              {filaLocal.map((item) => (
                <div key={item.id} className="rounded border border-white/10 bg-black/20 p-2">
                  <div className="flex items-center gap-2">
                    <input
                      value={item.titulo}
                      onChange={(e) => atualizarItemFila(item.id, { titulo: e.target.value })}
                      disabled={item.status === "enviando" || item.status === "concluido"}
                      className="min-w-0 flex-1 rounded border border-white/10 bg-black/30 px-2 py-1 text-xs outline-none focus:border-brand disabled:opacity-60"
                    />
                    <input
                      type="number"
                      value={item.numero ?? ""}
                      onChange={(e) =>
                        atualizarItemFila(item.id, { numero: e.target.value ? Number(e.target.value) : null })
                      }
                      disabled={item.status === "enviando" || item.status === "concluido"}
                      placeholder="Nº"
                      className="w-14 rounded border border-white/10 bg-black/30 px-2 py-1 text-xs outline-none focus:border-brand disabled:opacity-60"
                    />
                    {temporadas && temporadas.length > 0 && (
                      <select
                        value={item.temporada_id ?? ""}
                        onChange={(e) =>
                          atualizarItemFila(item.id, {
                            temporada_id: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        disabled={item.status === "enviando" || item.status === "concluido"}
                        className="rounded border border-white/10 bg-black/30 px-1 py-1 text-xs outline-none focus:border-brand disabled:opacity-60"
                      >
                        <option value="">Sem temp.</option>
                        {temporadas.map((t) => (
                          <option key={t.id} value={t.id}>
                            T{t.numero}
                          </option>
                        ))}
                      </select>
                    )}
                    {item.status === "enviando" && <Loader2 size={16} className="shrink-0 animate-spin text-white/50" />}
                    {item.status === "concluido" && <CheckCircle2 size={16} className="shrink-0 text-green-400" />}
                    {item.status === "erro" && <AlertCircle size={16} className="shrink-0 text-red-400" />}
                    {item.status === "pendente" && (
                      <button
                        onClick={() => removerItemFila(item.id)}
                        className="shrink-0 text-white/40 hover:text-red-400"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  {item.status === "enviando" && (
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded bg-white/10">
                      <div
                        className="h-full bg-brand transition-all"
                        style={{ width: `${item.progresso}%` }}
                      />
                    </div>
                  )}
                  {item.erro && <p className="mt-1 text-xs text-red-300">{item.erro}</p>}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleEnviarFila}
              disabled={!haFilaPendente || enviandoFila}
              className="rounded bg-brand px-4 py-2 text-sm font-semibold hover:bg-brand-dark disabled:opacity-60"
            >
              {enviandoFila ? "Enviando..." : `Enviar ${filaLocal.filter((i) => i.status !== "concluido").length || ""} vídeo(s)`}
            </button>
            {haFilaConcluida && (
              <button
                type="button"
                onClick={handleLimparConcluidos}
                className="rounded bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20"
              >
                Limpar concluídos
              </button>
            )}
          </div>
        </div>
      </div>

      {temporadas && temporadas.length > 0 && (
        <div className="mb-3 flex items-center gap-2 text-sm">
          <span className="text-white/60">Filtrar por temporada:</span>
          <select
            value={filtroTemporada}
            onChange={(e) => setFiltroTemporada(e.target.value)}
            className="rounded border border-white/10 bg-black/30 px-2 py-1 outline-none focus:border-brand"
          >
            <option value="todas">Todas</option>
            <option value="sem">Sem temporada</option>
            {temporadas.map((t) => (
              <option key={t.id} value={t.id}>
                {temporadaLabel(t)}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="rounded border border-white/10">
        {listaFiltrada.map((ep) => (
          <div
            key={ep.id}
            draggable
            onDragStart={() => handleDragStart(ep.id)}
            onDragOver={(e) => handleDragOver(e, ep.id)}
            onDrop={handleDrop}
            className="flex cursor-grab items-center gap-3 border-b border-white/10 px-4 py-3 last:border-b-0 active:cursor-grabbing"
          >
            <GripVertical size={16} className="text-white/30" />

            <div className="h-12 w-20 shrink-0 overflow-hidden rounded bg-white/10">
              {ep.thumbnail_url && <img src={ep.thumbnail_url} alt="" className="h-full w-full object-cover" />}
            </div>

            <div className="min-w-0 flex-1">
              {editandoId === ep.id ? (
                <div className="flex flex-wrap gap-2">
                  <input
                    autoFocus
                    value={tituloEdicao}
                    onChange={(e) => setTituloEdicao(e.target.value)}
                    className="flex-1 rounded border border-white/20 bg-black/40 px-2 py-1 text-sm outline-none"
                  />
                  <input
                    type="number"
                    value={numeroEdicao}
                    onChange={(e) => setNumeroEdicao(e.target.value)}
                    placeholder="Nº"
                    className="w-16 rounded border border-white/20 bg-black/40 px-2 py-1 text-sm outline-none"
                  />
                  {temporadas && temporadas.length > 0 && (
                    <select
                      value={temporadaEdicaoEpisodio}
                      onChange={(e) => setTemporadaEdicaoEpisodio(e.target.value)}
                      className="rounded border border-white/20 bg-black/40 px-2 py-1 text-sm outline-none"
                    >
                      <option value="">Sem temporada</option>
                      {temporadas.map((t) => (
                        <option key={t.id} value={t.id}>
                          T{t.numero}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ) : (
                <p className="truncate text-sm font-medium">
                  {ep.numero !== null && <span className="text-white/50">#{ep.numero} </span>}
                  {ep.titulo}
                </p>
              )}
              <p className="text-xs text-white/50">
                {fonteLabel(ep.fonte)} · {formatarDuracao(ep.duracao_segundos)}
                {ep.temporada_id !== null &&
                  temporadas &&
                  ` · ${temporadaLabel(temporadas.find((t) => t.id === ep.temporada_id) ?? { id: 0, serie_id: 0, numero: 0, titulo: null })}`}
              </p>
            </div>

            <span
              className={`rounded px-2 py-0.5 text-xs ${
                ep.status_processamento === "pronto"
                  ? "bg-green-500/20 text-green-300"
                  : ep.status_processamento === "erro"
                    ? "bg-red-500/20 text-red-300"
                    : "bg-yellow-500/20 text-yellow-300"
              }`}
            >
              {ep.status_processamento}
            </span>

            <div className="flex items-center gap-3">
              {ep.fonte === "youtube_embed" && ep.status_processamento === "pronto" && (
                <button
                  onClick={() => handleBaixar(ep)}
                  className="text-white/50 hover:text-white"
                  title="Baixar para o servidor"
                >
                  <Download size={16} />
                </button>
              )}
              {ep.status_processamento === "erro" && (
                <button
                  onClick={() => handleBaixar(ep)}
                  className="text-red-300 hover:text-red-200"
                  title="Tentar novamente"
                >
                  <RotateCw size={16} />
                </button>
              )}
              {editandoId === ep.id ? (
                <button
                  onClick={() => salvarEdicao(ep)}
                  className="rounded bg-brand px-2 py-1 text-xs font-semibold hover:bg-brand-dark"
                >
                  Salvar
                </button>
              ) : (
                <button onClick={() => iniciarEdicao(ep)} className="text-white/50 hover:text-white" title="Editar">
                  <Pencil size={16} />
                </button>
              )}
              <button onClick={() => handleExcluir(ep)} className="text-white/50 hover:text-red-400" title="Excluir">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {listaFiltrada.length === 0 && (
          <p className="px-4 py-8 text-center text-white/50">
            {lista.length === 0 ? "Nenhum episódio cadastrado ainda." : "Nenhum episódio nessa temporada."}
          </p>
        )}
      </div>
    </div>
  );
}
