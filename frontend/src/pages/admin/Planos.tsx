import { Pencil, Plus, Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";

import { useConfirm } from "@/components/ui/ConfirmProvider";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import { useCreatePlano, useDeletePlano, usePlanos, useUpdatePlano } from "@/hooks/usePlanos";
import type { Plano, PlanoInput } from "@/types/admin";

const FORM_VAZIO: PlanoInput = {
  nome: "",
  descricao: "",
  preco_centavos: 0,
  duracao_dias: 30,
  ativo: true,
};

function centavosParaReais(centavos: number): string {
  return (centavos / 100).toFixed(2);
}

export function Planos() {
  const { data: planos, isLoading } = usePlanos();
  const criar = useCreatePlano();
  const atualizar = useUpdatePlano();
  const excluir = useDeletePlano();
  const { confirmar, alertar } = useConfirm();

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [form, setForm] = useState<PlanoInput>(FORM_VAZIO);
  const [precoReais, setPrecoReais] = useState("0.00");
  const [mostrarForm, setMostrarForm] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function abrirNovo() {
    setEditandoId(null);
    setForm(FORM_VAZIO);
    setPrecoReais("0.00");
    setMostrarForm(true);
    setErro(null);
  }

  function abrirEdicao(plano: Plano) {
    setEditandoId(plano.id);
    setForm({
      nome: plano.nome,
      descricao: plano.descricao ?? "",
      preco_centavos: plano.preco_centavos,
      duracao_dias: plano.duracao_dias,
      ativo: plano.ativo,
    });
    setPrecoReais(centavosParaReais(plano.preco_centavos));
    setMostrarForm(true);
    setErro(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    const data: PlanoInput = { ...form, preco_centavos: Math.round(Number(precoReais) * 100) };
    try {
      if (editandoId) await atualizar.mutateAsync({ id: editandoId, data });
      else await criar.mutateAsync(data);
      setMostrarForm(false);
    } catch {
      setErro("Não foi possível salvar o plano.");
    }
  }

  async function handleExcluir(plano: Plano) {
    const ok = await confirmar({ message: `Excluir o plano "${plano.nome}"?`, danger: true, confirmLabel: "Excluir" });
    if (!ok) return;
    try {
      await excluir.mutateAsync(plano.id);
    } catch {
      await alertar("Este plano possui assinaturas vinculadas. Desative-o em vez de excluir.");
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Planos</h1>
        <button
          onClick={abrirNovo}
          className="flex items-center gap-2 rounded bg-brand px-4 py-2 text-sm font-semibold hover:bg-brand-dark"
        >
          <Plus size={16} />
          Novo plano
        </button>
      </div>

      {mostrarForm && (
        <form onSubmit={handleSubmit} className="mb-8 space-y-3 rounded border border-white/10 p-4">
          {erro && <p className="text-sm text-red-300">{erro}</p>}
          <div>
            <label className="mb-1 block text-sm text-white/70">Nome</label>
            <input
              required
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-white/70">Descrição</label>
            <input
              value={form.descricao ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
              className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm text-white/70">Preço (R$)</label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={precoReais}
                onChange={(e) => setPrecoReais(e.target.value)}
                className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-white/70">Duração (dias)</label>
              <input
                required
                type="number"
                min="1"
                value={form.duracao_dias}
                onChange={(e) => setForm((f) => ({ ...f, duracao_dias: Number(e.target.value) }))}
                className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-white/70">Status</label>
              <select
                value={form.ativo ? "1" : "0"}
                onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.value === "1" }))}
                className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-brand"
              >
                <option value="1">Ativo</option>
                <option value="0">Inativo</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              className="rounded bg-brand px-4 py-2 text-sm font-semibold hover:bg-brand-dark"
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={() => setMostrarForm(false)}
              className="rounded bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-black/30 text-left text-white/60">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Preço</th>
                <th className="px-4 py-3">Duração</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {isLoading ? (
                <TableSkeleton rows={4} cols={5} />
              ) : (
                <>
                  {planos?.map((plano) => (
                    <tr key={plano.id} className="hover:bg-white/5">
                      <td className="px-4 py-3 font-medium">{plano.nome}</td>
                      <td className="px-4 py-3 text-white/70">R$ {centavosParaReais(plano.preco_centavos)}</td>
                      <td className="px-4 py-3 text-white/70">{plano.duracao_dias} dias</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded px-2 py-0.5 text-xs ${
                            plano.ativo ? "bg-green-500/20 text-green-300" : "bg-white/10 text-white/50"
                          }`}
                        >
                          {plano.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-3">
                          <button onClick={() => abrirEdicao(plano)} className="text-white/50 hover:text-white">
                            <Pencil size={16} />
                          </button>
                          <button onClick={() => handleExcluir(plano)} className="text-white/50 hover:text-red-400">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {planos?.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-white/50">
                        Nenhum plano cadastrado.
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
    </div>
  );
}
