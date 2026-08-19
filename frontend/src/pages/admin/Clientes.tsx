import { Plus, Settings } from "lucide-react";
import { type FormEvent, useState } from "react";

import { ClienteDetalhesModal } from "@/components/admin/ClienteDetalhesModal";
import { Pagination } from "@/components/ui/Pagination";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import {
  useAtribuirAssinatura,
  useClientesAdmin,
  useCreateClienteAdmin,
  useUpdateClienteAdmin,
} from "@/hooks/useClientesAdmin";
import { usePlanos } from "@/hooks/usePlanos";
import type { ClienteAdmin } from "@/types/admin";

function formatarData(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("pt-BR");
}

const FORM_VAZIO = { nome: "", email: "", senha: "", plano_id: "" };

export function Clientes() {
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const { data, isLoading } = useClientesAdmin({ busca: busca || undefined, page: pagina });
  const clientes = data?.itens;
  const { data: planos } = usePlanos();
  const criar = useCreateClienteAdmin();
  const atualizar = useUpdateClienteAdmin();
  const atribuirAssinatura = useAtribuirAssinatura();

  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  const [erro, setErro] = useState<string | null>(null);
  const [planoParaAtribuir, setPlanoParaAtribuir] = useState<Record<number, string>>({});
  const [erroAtribuir, setErroAtribuir] = useState<Record<number, string>>({});
  const [sucessoAtribuir, setSucessoAtribuir] = useState<number | null>(null);
  const [clienteDetalhes, setClienteDetalhes] = useState<ClienteAdmin | null>(null);

  async function handleCriar(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    try {
      await criar.mutateAsync({
        nome: form.nome,
        email: form.email,
        senha: form.senha,
        plano_id: form.plano_id ? Number(form.plano_id) : null,
      });
      setForm(FORM_VAZIO);
      setMostrarForm(false);
    } catch {
      setErro("Não foi possível criar o cliente (e-mail já cadastrado?).");
    }
  }

  async function toggleBloqueio(cliente: ClienteAdmin) {
    await atualizar.mutateAsync({
      id: cliente.id,
      data: {
        nome: cliente.nome,
        email: cliente.email,
        status: cliente.status === "ativo" ? "bloqueado" : "ativo",
      },
    });
  }

  async function handleAtribuirAssinatura(clienteId: number) {
    const planoId = planoParaAtribuir[clienteId];
    if (!planoId) return;
    setErroAtribuir((atual) => ({ ...atual, [clienteId]: "" }));
    setSucessoAtribuir(null);
    try {
      await atribuirAssinatura.mutateAsync({ id: clienteId, plano_id: Number(planoId) });
      // Não reseta pra "": limpa a escolha manual e deixa o <select> cair de volta pro
      // fallback (plano_atual_id, já atualizado pelo refetch) — assim ele continua
      // mostrando o plano recém-atribuído em vez de voltar pra "Selecionar...", que
      // parecia bug ("atribuí e não aconteceu nada").
      setPlanoParaAtribuir((atual) => {
        const { [clienteId]: _removido, ...resto } = atual;
        return resto;
      });
      setSucessoAtribuir(clienteId);
      setTimeout(() => setSucessoAtribuir((atual) => (atual === clienteId ? null : atual)), 3000);
    } catch {
      setErroAtribuir((atual) => ({ ...atual, [clienteId]: "Falha ao atribuir o plano. Tente novamente." }));
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Clientes</h1>
        <button
          onClick={() => setMostrarForm((v) => !v)}
          className="flex items-center gap-2 rounded bg-brand px-4 py-2 text-sm font-semibold hover:bg-brand-dark"
        >
          <Plus size={16} />
          Novo cliente
        </button>
      </div>

      <div className="mb-4">
        <input
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value);
            setPagina(1);
          }}
          placeholder="Buscar por nome ou e-mail..."
          className="w-full max-w-sm rounded border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-brand"
        />
      </div>

      {mostrarForm && (
        <form onSubmit={handleCriar} className="mb-8 grid gap-3 rounded border border-white/10 p-4 md:grid-cols-2">
          {erro && <p className="text-sm text-red-300 md:col-span-2">{erro}</p>}
          <input
            required
            placeholder="Nome"
            value={form.nome}
            onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
            className="rounded border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <input
            required
            type="email"
            placeholder="E-mail"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="rounded border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <input
            required
            type="password"
            placeholder="Senha"
            minLength={6}
            value={form.senha}
            onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))}
            className="rounded border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <select
            value={form.plano_id}
            onChange={(e) => setForm((f) => ({ ...f, plano_id: e.target.value }))}
            className="rounded border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-brand"
          >
            <option value="">Sem plano (acesso bloqueado até atribuir)</option>
            {planos?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
          <div className="flex gap-3 md:col-span-2">
            <button type="submit" className="rounded bg-brand px-4 py-2 text-sm font-semibold hover:bg-brand-dark">
              Criar cliente
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
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Plano</th>
              <th className="px-4 py-3">Assinatura</th>
              <th className="px-4 py-3">Expira em</th>
              <th className="px-4 py-3">Conta</th>
              <th className="px-4 py-3">Atribuir plano</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {isLoading ? (
              <TableSkeleton rows={6} cols={8} />
            ) : (
              clientes?.map((cliente) => (
                <tr key={cliente.id} className="hover:bg-white/5">
                  <td className="px-4 py-3 font-medium">{cliente.nome}</td>
                  <td className="px-4 py-3 text-white/70">{cliente.email}</td>
                  <td className="px-4 py-3 text-white/70">{cliente.plano_atual ?? "-"}</td>
                  <td className="px-4 py-3">
                    {cliente.assinatura_status ? (
                      <span
                        className={`rounded px-2 py-0.5 text-xs ${
                          cliente.assinatura_status === "ativa"
                            ? "bg-green-500/20 text-green-300"
                            : "bg-yellow-500/20 text-yellow-300"
                        }`}
                      >
                        {cliente.assinatura_status}
                      </span>
                    ) : (
                      <span className="text-white/40">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-white/70">{formatarData(cliente.data_expiracao)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleBloqueio(cliente)}
                      className={`rounded px-2 py-0.5 text-xs ${
                        cliente.status === "ativo"
                          ? "bg-green-500/20 text-green-300 hover:bg-red-500/20 hover:text-red-300"
                          : "bg-red-500/20 text-red-300 hover:bg-green-500/20 hover:text-green-300"
                      }`}
                      title="Clique para alternar"
                    >
                      {cliente.status === "ativo" ? "Ativo" : "Bloqueado"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={
                          planoParaAtribuir[cliente.id] ??
                          (cliente.plano_atual_id !== null ? String(cliente.plano_atual_id) : "")
                        }
                        onChange={(e) =>
                          setPlanoParaAtribuir((atual) => ({ ...atual, [cliente.id]: e.target.value }))
                        }
                        className="rounded border border-white/10 bg-black/30 px-2 py-1 text-xs outline-none"
                      >
                        <option value="">Selecionar...</option>
                        {planos?.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nome}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleAtribuirAssinatura(cliente.id)}
                        disabled={!planoParaAtribuir[cliente.id] || atribuirAssinatura.isPending}
                        className="rounded bg-brand px-2 py-1 text-xs font-semibold hover:bg-brand-dark disabled:opacity-40"
                      >
                        Atribuir
                      </button>
                    </div>
                    {erroAtribuir[cliente.id] && (
                      <p className="mt-1 text-xs text-red-300">{erroAtribuir[cliente.id]}</p>
                    )}
                    {sucessoAtribuir === cliente.id && (
                      <p className="mt-1 text-xs text-green-300">Plano atribuído.</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setClienteDetalhes(cliente)}
                      className="flex items-center gap-1 text-white/50 hover:text-white"
                      title="Detalhes e assinaturas"
                    >
                      <Settings size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
            {!isLoading && clientes?.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-white/50">
                  Nenhum cliente cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && (
        <Pagination pagina={data.pagina} totalPaginas={data.total_paginas} total={data.total} onChange={setPagina} />
      )}

      {clienteDetalhes && (
        <ClienteDetalhesModal cliente={clienteDetalhes} onClose={() => setClienteDetalhes(null)} />
      )}
    </div>
  );
}
