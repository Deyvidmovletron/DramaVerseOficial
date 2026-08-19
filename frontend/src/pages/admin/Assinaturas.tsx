import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { type FormEvent, useState } from "react";

import { useConfirm } from "@/components/ui/ConfirmProvider";
import { Pagination } from "@/components/ui/Pagination";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import { useClientesAdmin } from "@/hooks/useClientesAdmin";
import { usePlanos } from "@/hooks/usePlanos";
import {
  useAssinaturasAdmin,
  useCreateAssinaturaAdmin,
  useDeleteAssinaturaAdmin,
  useUpdateAssinaturaAdmin,
} from "@/hooks/useAssinaturasAdmin";
import type { AssinaturaAdmin, StatusAssinaturaAdmin } from "@/types/admin";

const STATUS_OPCOES: StatusAssinaturaAdmin[] = ["pendente", "ativa", "atrasada", "cancelada"];

const STATUS_ESTILO: Record<StatusAssinaturaAdmin, string> = {
  ativa: "bg-green-500/20 text-green-300",
  pendente: "bg-white/10 text-white/60",
  atrasada: "bg-yellow-500/20 text-yellow-300",
  cancelada: "bg-red-500/20 text-red-300",
};

function formatarData(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("pt-BR");
}

function paraDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const data = new Date(iso);
  const offsetMs = data.getTimezoneOffset() * 60_000;
  return new Date(data.getTime() - offsetMs).toISOString().slice(0, 16);
}

function deDatetimeLocal(valor: string): string | null {
  return valor ? new Date(valor).toISOString() : null;
}

export function Assinaturas() {
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<string>("");
  const [pagina, setPagina] = useState(1);
  const { data, isLoading } = useAssinaturasAdmin({
    busca: busca || undefined,
    status: statusFiltro || undefined,
    page: pagina,
  });
  const assinaturas = data?.itens;

  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const excluir = useDeleteAssinaturaAdmin();
  const { confirmar } = useConfirm();

  async function handleExcluir(assinatura: AssinaturaAdmin) {
    const ok = await confirmar({
      message: `Excluir a assinatura de ${assinatura.cliente_nome} (${assinatura.plano_nome})? Essa ação não pode ser desfeita.`,
      danger: true,
      confirmLabel: "Excluir",
    });
    if (!ok) return;
    await excluir.mutateAsync(assinatura.id);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Assinaturas</h1>
        <button
          onClick={() => setMostrarForm((v) => !v)}
          className="flex items-center gap-2 rounded bg-brand px-4 py-2 text-sm font-semibold hover:bg-brand-dark"
        >
          <Plus size={16} />
          Nova assinatura
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value);
            setPagina(1);
          }}
          placeholder="Buscar por cliente ou e-mail..."
          className="w-full max-w-sm rounded border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-brand"
        />
        <select
          value={statusFiltro}
          onChange={(e) => {
            setStatusFiltro(e.target.value);
            setPagina(1);
          }}
          className="rounded border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-brand"
        >
          <option value="">Todos os status</option>
          {STATUS_OPCOES.map((opcao) => (
            <option key={opcao} value={opcao}>
              {opcao}
            </option>
          ))}
        </select>
      </div>

      {mostrarForm && <NovaAssinaturaForm onFechar={() => setMostrarForm(false)} />}

      <div className="overflow-x-auto rounded border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-black/30 text-left text-white/60">
            <tr>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Plano</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Início</th>
              <th className="px-4 py-3">Vencimento</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {isLoading ? (
              <TableSkeleton rows={6} cols={6} />
            ) : (
              assinaturas?.map((assinatura) =>
                editandoId === assinatura.id ? (
                  <LinhaEdicao key={assinatura.id} assinatura={assinatura} onFechar={() => setEditandoId(null)} />
                ) : (
                  <tr key={assinatura.id} className="hover:bg-white/5">
                    <td className="px-4 py-3">
                      <p className="font-medium">{assinatura.cliente_nome}</p>
                      <p className="text-xs text-white/50">{assinatura.cliente_email}</p>
                    </td>
                    <td className="px-4 py-3 text-white/70">{assinatura.plano_nome}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-0.5 text-xs ${STATUS_ESTILO[assinatura.status]}`}>
                        {assinatura.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/70">{formatarData(assinatura.data_inicio)}</td>
                    <td className="px-4 py-3 text-white/70">{formatarData(assinatura.data_expiracao)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setEditandoId(assinatura.id)}
                          className="text-white/50 hover:text-white"
                          title="Editar"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleExcluir(assinatura)}
                          className="text-white/50 hover:text-red-400"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ),
              )
            )}
            {!isLoading && assinaturas?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-white/50">
                  Nenhuma assinatura encontrada.
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

function NovaAssinaturaForm({ onFechar }: { onFechar: () => void }) {
  const { data: planos } = usePlanos();
  const [buscaCliente, setBuscaCliente] = useState("");
  const { data: clientesEncontrados } = useClientesAdmin({ busca: buscaCliente || undefined, page_size: 10 });
  const criar = useCreateAssinaturaAdmin();

  const [clienteId, setClienteId] = useState("");
  const [planoId, setPlanoId] = useState("");
  const [statusInicial, setStatusInicial] = useState<StatusAssinaturaAdmin>("ativa");
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    if (!clienteId || !planoId) {
      setErro("Selecione um cliente e um plano.");
      return;
    }
    try {
      await criar.mutateAsync({ cliente_id: Number(clienteId), plano_id: Number(planoId), status: statusInicial });
      onFechar();
    } catch {
      setErro("Não foi possível criar a assinatura.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 grid gap-3 rounded border border-white/10 p-4 md:grid-cols-2">
      {erro && <p className="text-sm text-red-300 md:col-span-2">{erro}</p>}

      <div>
        <label className="mb-1 block text-xs text-white/60">Buscar cliente</label>
        <input
          value={buscaCliente}
          onChange={(e) => setBuscaCliente(e.target.value)}
          placeholder="Nome ou e-mail..."
          className="mb-2 w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-brand"
        />
        <select
          required
          value={clienteId}
          onChange={(e) => setClienteId(e.target.value)}
          className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-brand"
        >
          <option value="">Selecione o cliente...</option>
          {clientesEncontrados?.itens.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome} — {c.email}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <label className="mb-1 block text-xs text-white/60">Plano</label>
          <select
            required
            value={planoId}
            onChange={(e) => setPlanoId(e.target.value)}
            className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-brand"
          >
            <option value="">Selecione o plano...</option>
            {planos?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-white/60">Status inicial</label>
          <select
            value={statusInicial}
            onChange={(e) => setStatusInicial(e.target.value as StatusAssinaturaAdmin)}
            className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-brand"
          >
            {STATUS_OPCOES.map((opcao) => (
              <option key={opcao} value={opcao}>
                {opcao}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-xs text-white/40 md:col-span-2">
        Com status "ativa", início e vencimento são calculados automaticamente (agora até agora + duração do
        plano) — edite depois se precisar de datas diferentes.
      </p>

      <div className="flex gap-3 md:col-span-2">
        <button
          type="submit"
          disabled={criar.isPending}
          className="rounded bg-brand px-4 py-2 text-sm font-semibold hover:bg-brand-dark disabled:opacity-60"
        >
          {criar.isPending ? "Criando..." : "Criar assinatura"}
        </button>
        <button
          type="button"
          onClick={onFechar}
          className="rounded bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function LinhaEdicao({ assinatura, onFechar }: { assinatura: AssinaturaAdmin; onFechar: () => void }) {
  const { data: planos } = usePlanos();
  const atualizar = useUpdateAssinaturaAdmin();

  const [planoId, setPlanoId] = useState(String(assinatura.plano_id));
  const [status, setStatus] = useState(assinatura.status);
  const [inicio, setInicio] = useState(paraDatetimeLocal(assinatura.data_inicio));
  const [expiracao, setExpiracao] = useState(paraDatetimeLocal(assinatura.data_expiracao));
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    setErro(null);
    try {
      await atualizar.mutateAsync({
        id: assinatura.id,
        data: {
          status,
          plano_id: Number(planoId),
          data_inicio: deDatetimeLocal(inicio),
          data_expiracao: deDatetimeLocal(expiracao),
        },
      });
      onFechar();
    } catch {
      setErro("Não foi possível salvar.");
    }
  }

  return (
    <tr className="bg-black/20">
      <td className="px-4 py-3">
        <p className="font-medium">{assinatura.cliente_nome}</p>
        <p className="text-xs text-white/50">{assinatura.cliente_email}</p>
        {erro && <p className="mt-1 text-xs text-red-300">{erro}</p>}
      </td>
      <td className="px-4 py-3">
        <select
          value={planoId}
          onChange={(e) => setPlanoId(e.target.value)}
          className="w-full rounded border border-white/10 bg-black/30 px-2 py-1.5 text-xs outline-none focus:border-brand"
        >
          {planos?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusAssinaturaAdmin)}
          className="w-full rounded border border-white/10 bg-black/30 px-2 py-1.5 text-xs outline-none focus:border-brand"
        >
          {STATUS_OPCOES.map((opcao) => (
            <option key={opcao} value={opcao}>
              {opcao}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3">
        <input
          type="datetime-local"
          value={inicio}
          onChange={(e) => setInicio(e.target.value)}
          className="w-full rounded border border-white/10 bg-black/30 px-2 py-1.5 text-xs outline-none focus:border-brand"
        />
      </td>
      <td className="px-4 py-3">
        <input
          type="datetime-local"
          value={expiracao}
          onChange={(e) => setExpiracao(e.target.value)}
          className="w-full rounded border border-white/10 bg-black/30 px-2 py-1.5 text-xs outline-none focus:border-brand"
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={salvar}
            disabled={atualizar.isPending}
            className="text-green-400 hover:text-green-300 disabled:opacity-60"
            title="Salvar"
          >
            <Check size={16} />
          </button>
          <button onClick={onFechar} className="text-white/50 hover:text-white" title="Cancelar">
            <X size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
}
