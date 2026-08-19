import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { useConfirm } from "@/components/ui/ConfirmProvider";
import { Pagination } from "@/components/ui/Pagination";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import { useCategorias } from "@/hooks/useCategorias";
import { useDeleteSerie, useSeries } from "@/hooks/useSeries";

export function Series() {
  const [busca, setBusca] = useState("");
  const [categoriaId, setCategoriaId] = useState<string>("");
  const [statusSerie, setStatusSerie] = useState<string>("");
  const [pagina, setPagina] = useState(1);

  const { data: categorias } = useCategorias();
  const { data, isLoading } = useSeries({
    busca: busca || undefined,
    categoria_id: categoriaId ? Number(categoriaId) : undefined,
    status_serie: statusSerie || undefined,
    page: pagina,
  });
  const series = data?.itens;
  const excluir = useDeleteSerie();
  const { confirmar } = useConfirm();

  async function handleExcluir(id: number, titulo: string) {
    const ok = await confirmar({
      message: `Excluir a série "${titulo}"? Todos os episódios serão removidos.`,
      danger: true,
      confirmLabel: "Excluir",
    });
    if (!ok) return;
    await excluir.mutateAsync(id);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Séries</h1>
        <Link
          to="/admin/series/novo"
          className="flex items-center gap-2 rounded bg-brand px-4 py-2 text-sm font-semibold hover:bg-brand-dark"
        >
          <Plus size={16} />
          Nova série
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value);
            setPagina(1);
          }}
          placeholder="Buscar por título..."
          className="rounded border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-brand"
        />
        <select
          value={categoriaId}
          onChange={(e) => {
            setCategoriaId(e.target.value);
            setPagina(1);
          }}
          className="rounded border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-brand"
        >
          <option value="">Todas as categorias</option>
          {categorias?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
        <select
          value={statusSerie}
          onChange={(e) => {
            setStatusSerie(e.target.value);
            setPagina(1);
          }}
          className="rounded border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-brand"
        >
          <option value="">Todos os status</option>
          <option value="publicado">Publicado</option>
          <option value="rascunho">Rascunho</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-black/30 text-left text-white/60">
            <tr>
              <th className="px-4 py-3">Capa</th>
              <th className="px-4 py-3">Título</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Ano</th>
              <th className="px-4 py-3">Episódios</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {isLoading ? (
              <TableSkeleton rows={6} cols={7} />
            ) : (
              series?.map((serie) => (
                <tr key={serie.id} className="hover:bg-white/5">
                  <td className="px-4 py-2">
                    <div className="h-14 w-10 overflow-hidden rounded bg-white/10">
                      {serie.capa_url && (
                        <img src={serie.capa_url} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 font-medium">{serie.titulo}</td>
                  <td className="px-4 py-2 text-white/70">{serie.categoria?.nome ?? "-"}</td>
                  <td className="px-4 py-2 text-white/70">{serie.ano ?? "-"}</td>
                  <td className="px-4 py-2 text-white/70">{serie.total_episodios}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        serie.status === "publicado"
                          ? "bg-green-500/20 text-green-300"
                          : "bg-yellow-500/20 text-yellow-300"
                      }`}
                    >
                      {serie.status === "publicado" ? "Publicado" : "Rascunho"}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        to={`/admin/series/${serie.id}/editar`}
                        className="text-white/50 hover:text-white"
                        title="Editar"
                      >
                        <Pencil size={16} />
                      </Link>
                      <button
                        onClick={() => handleExcluir(serie.id, serie.titulo)}
                        className="text-white/50 hover:text-red-400"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
            {!isLoading && series?.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-white/50">
                  Nenhuma série encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && (
        <Pagination pagina={data.pagina} totalPaginas={data.total_paginas} total={data.total} onChange={setPagina} />
      )}
    </div>
  );
}
