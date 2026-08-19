import { Pencil, Trash2, X } from "lucide-react";
import { type FormEvent, useState } from "react";

import { useConfirm } from "@/components/ui/ConfirmProvider";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  useCategorias,
  useCreateCategoria,
  useDeleteCategoria,
  useUpdateCategoria,
} from "@/hooks/useCategorias";

function CategoriasSkeleton() {
  return (
    <ul className="divide-y divide-white/10 rounded border border-white/10">
      {Array.from({ length: 5 }).map((_, i) => (
        <li key={i} className="flex items-center justify-between px-4 py-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-10" />
        </li>
      ))}
    </ul>
  );
}

export function Categorias() {
  const { data: categorias, isLoading, isError } = useCategorias();
  const criar = useCreateCategoria();
  const atualizar = useUpdateCategoria();
  const excluir = useDeleteCategoria();
  const { confirmar } = useConfirm();

  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [nomeEdicao, setNomeEdicao] = useState("");

  async function handleCriar(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    try {
      await criar.mutateAsync(nome.trim());
      setNome("");
    } catch {
      setErro("Já existe uma categoria com esse nome.");
    }
  }

  function iniciarEdicao(id: number, nomeAtual: string) {
    setEditandoId(id);
    setNomeEdicao(nomeAtual);
  }

  async function salvarEdicao(id: number) {
    try {
      await atualizar.mutateAsync({ id, nome: nomeEdicao.trim() });
      setEditandoId(null);
    } catch {
      setErro("Já existe uma categoria com esse nome.");
    }
  }

  async function handleExcluir(id: number) {
    const ok = await confirmar({
      message: "Excluir esta categoria? Séries vinculadas ficarão sem categoria.",
      danger: true,
      confirmLabel: "Excluir",
    });
    if (!ok) return;
    await excluir.mutateAsync(id);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold">Categorias</h1>

      <form onSubmit={handleCriar} className="mb-6 flex gap-2">
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
          placeholder="Nova categoria"
          className="flex-1 rounded border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-brand"
        />
        <button
          type="submit"
          disabled={criar.isPending}
          className="rounded bg-brand px-4 py-2 text-sm font-semibold hover:bg-brand-dark disabled:opacity-60"
        >
          Adicionar
        </button>
      </form>

      {erro && <p className="mb-4 text-sm text-red-300">{erro}</p>}

      {isLoading ? (
        <CategoriasSkeleton />
      ) : isError ? (
        <p className="rounded border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Não foi possível carregar as categorias. Tente recarregar a página.
        </p>
      ) : (
        <ul className="divide-y divide-white/10 rounded border border-white/10">
          {categorias?.map((categoria) => (
            <li key={categoria.id} className="flex items-center justify-between px-4 py-3">
              {editandoId === categoria.id ? (
                <input
                  autoFocus
                  value={nomeEdicao}
                  onChange={(e) => setNomeEdicao(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && salvarEdicao(categoria.id)}
                  className="flex-1 rounded border border-white/20 bg-black/40 px-2 py-1 text-sm outline-none"
                />
              ) : (
                <span>{categoria.nome}</span>
              )}

              <div className="flex items-center gap-2">
                {editandoId === categoria.id ? (
                  <>
                    <button
                      onClick={() => salvarEdicao(categoria.id)}
                      className="rounded bg-brand px-2 py-1 text-xs font-semibold hover:bg-brand-dark"
                    >
                      Salvar
                    </button>
                    <button onClick={() => setEditandoId(null)} className="text-white/50 hover:text-white">
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => iniciarEdicao(categoria.id, categoria.nome)}
                      className="text-white/50 hover:text-white"
                      title="Editar"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleExcluir(categoria.id)}
                      className="text-white/50 hover:text-red-400"
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
          {categorias?.length === 0 && (
            <li className="px-4 py-6 text-center text-white/50">Nenhuma categoria cadastrada.</li>
          )}
        </ul>
      )}
    </div>
  );
}
