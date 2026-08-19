import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useCategorias } from "@/hooks/useCategorias";
import { useCreateSerie, useSerie, useUpdateSerie, useUploadImagemSerie } from "@/hooks/useSeries";
import type { SerieInput, StatusSerie } from "@/types/admin";

const FORM_VAZIO: SerieInput = {
  titulo: "",
  sinopse: "",
  categoria_id: null,
  ano: null,
  status: "rascunho",
};

export function SerieForm() {
  const { id } = useParams<{ id: string }>();
  const serieId = id ? Number(id) : undefined;
  const modoEdicao = serieId !== undefined;
  const navigate = useNavigate();

  const { data: categorias } = useCategorias();
  const { data: serie } = useSerie(serieId);
  const criar = useCreateSerie();
  const atualizar = useUpdateSerie();
  const uploadCapa = useUploadImagemSerie("capa");
  const uploadBanner = useUploadImagemSerie("banner");

  const [form, setForm] = useState<SerieInput>(FORM_VAZIO);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (serie) {
      setForm({
        titulo: serie.titulo,
        sinopse: serie.sinopse ?? "",
        categoria_id: serie.categoria?.id ?? null,
        ano: serie.ano,
        status: serie.status,
      });
    }
  }, [serie]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    try {
      if (modoEdicao && serieId) {
        await atualizar.mutateAsync({ id: serieId, data: form });
      } else {
        const nova = await criar.mutateAsync(form);
        navigate(`/admin/series/${nova.id}/editar`, { replace: true });
      }
    } catch {
      setErro("Não foi possível salvar a série.");
    }
  }

  function handleUpload(tipo: "capa" | "banner") {
    return async (event: ChangeEvent<HTMLInputElement>) => {
      const arquivo = event.target.files?.[0];
      if (!arquivo || !serieId) return;
      const mutation = tipo === "capa" ? uploadCapa : uploadBanner;
      try {
        await mutation.mutateAsync({ id: serieId, arquivo });
      } catch {
        setErro("Falha ao enviar imagem. Use JPEG, PNG ou WEBP (máx. 8MB).");
      }
      event.target.value = "";
    };
  }

  const salvando = criar.isPending || atualizar.isPending;

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{modoEdicao ? "Editar série" : "Nova série"}</h1>
        {modoEdicao && (
          <Link
            to={`/admin/series/${serieId}/episodios`}
            className="rounded bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20"
          >
            Gerenciar episódios ({serie?.total_episodios ?? 0})
          </Link>
        )}
      </div>

      {erro && <p className="mb-4 rounded bg-brand/20 px-3 py-2 text-sm text-red-200">{erro}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-white/70">Título</label>
          <input
            required
            value={form.titulo}
            onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
            className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-white/70">Sinopse</label>
          <textarea
            value={form.sinopse ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, sinopse: e.target.value }))}
            rows={4}
            className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block text-sm text-white/70">Categoria</label>
            <select
              value={form.categoria_id ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, categoria_id: e.target.value ? Number(e.target.value) : null }))
              }
              className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-brand"
            >
              <option value="">Sem categoria</option>
              {categorias?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm text-white/70">Ano</label>
            <input
              type="number"
              value={form.ano ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, ano: e.target.value ? Number(e.target.value) : null }))}
              className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-white/70">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as StatusSerie }))}
              className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-brand"
            >
              <option value="rascunho">Rascunho</option>
              <option value="publicado">Publicado</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={salvando}
            className="rounded bg-brand px-5 py-2.5 text-sm font-semibold hover:bg-brand-dark disabled:opacity-60"
          >
            {salvando ? "Salvando..." : "Salvar"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/admin/series")}
            className="rounded bg-white/10 px-5 py-2.5 text-sm font-semibold hover:bg-white/20"
          >
            Voltar
          </button>
        </div>
      </form>

      {modoEdicao && serie && (
        <div className="mt-10 space-y-6 border-t border-white/10 pt-6">
          <h2 className="text-lg font-semibold">Imagens</h2>

          <div className="flex gap-8">
            <div>
              <p className="mb-2 text-sm text-white/70">Capa (retrato)</p>
              <div className="mb-2 h-48 w-32 overflow-hidden rounded bg-white/10">
                {serie.capa_url && <img src={serie.capa_url} alt="" className="h-full w-full object-cover" />}
              </div>
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleUpload("capa")} />
            </div>

            <div>
              <p className="mb-2 text-sm text-white/70">Banner (destaque)</p>
              <div className="mb-2 h-32 w-64 overflow-hidden rounded bg-white/10">
                {serie.banner_url && (
                  <img src={serie.banner_url} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleUpload("banner")} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
