import { X } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";

import { useAssinaturaCliente, useUpdateAssinaturaCliente, useUpdateClienteAdmin } from "@/hooks/useClientesAdmin";
import type { ClienteAdmin, StatusAssinaturaAdmin } from "@/types/admin";

const STATUS_ASSINATURA_OPCOES: StatusAssinaturaAdmin[] = ["pendente", "ativa", "atrasada", "cancelada"];

const STATUS_ASSINATURA_ESTILO: Record<StatusAssinaturaAdmin, string> = {
  ativa: "bg-green-500/20 text-green-300",
  pendente: "bg-white/10 text-white/60",
  atrasada: "bg-yellow-500/20 text-yellow-300",
  cancelada: "bg-red-500/20 text-red-300",
};

function formatarData(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("pt-BR");
}

// <input type="datetime-local"> exige "AAAA-MM-DDTHH:mm" (sem timezone) — o backend manda
// e recebe ISO com timezone/segundos, então precisa converter nos dois sentidos.
function paraDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const data = new Date(iso);
  const offsetMs = data.getTimezoneOffset() * 60_000;
  return new Date(data.getTime() - offsetMs).toISOString().slice(0, 16);
}

function deDatetimeLocal(valor: string): string | null {
  return valor ? new Date(valor).toISOString() : null;
}

interface ClienteDetalhesModalProps {
  cliente: ClienteAdmin;
  onClose: () => void;
}

export function ClienteDetalhesModal({ cliente, onClose }: ClienteDetalhesModalProps) {
  const [aba, setAba] = useState<"dados" | "assinaturas">("dados");

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded border border-white/10 bg-surface p-6 text-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{cliente.nome}</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="mb-5 flex gap-2 border-b border-white/10">
          <button
            onClick={() => setAba("dados")}
            className={`px-3 py-2 text-sm font-semibold ${
              aba === "dados" ? "border-b-2 border-brand text-white" : "text-white/50 hover:text-white"
            }`}
          >
            Dados
          </button>
          <button
            onClick={() => setAba("assinaturas")}
            className={`px-3 py-2 text-sm font-semibold ${
              aba === "assinaturas" ? "border-b-2 border-brand text-white" : "text-white/50 hover:text-white"
            }`}
          >
            Assinaturas
          </button>
        </div>

        {aba === "dados" ? <AbaDados cliente={cliente} /> : <AbaAssinaturas clienteId={cliente.id} />}
      </div>
    </div>
  );
}

function AbaDados({ cliente }: { cliente: ClienteAdmin }) {
  const atualizar = useUpdateClienteAdmin();
  const [nome, setNome] = useState(cliente.nome);
  const [email, setEmail] = useState(cliente.email);
  const [statusConta, setStatusConta] = useState(cliente.status);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setSalvo(false);
    try {
      await atualizar.mutateAsync({ id: cliente.id, data: { nome, email, status: statusConta } });
      setSalvo(true);
    } catch {
      setErro("Não foi possível salvar (e-mail já usado por outro cliente?).");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {erro && <p className="text-sm text-red-300">{erro}</p>}
      {salvo && <p className="text-sm text-green-300">Dados atualizados.</p>}

      <div>
        <label className="mb-1 block text-xs text-white/60">Nome</label>
        <input
          required
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-brand"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-white/60">E-mail</label>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-brand"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-white/60">Status da conta</label>
        <select
          value={statusConta}
          onChange={(e) => setStatusConta(e.target.value as ClienteAdmin["status"])}
          className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-brand"
        >
          <option value="ativo">Ativo</option>
          <option value="bloqueado">Bloqueado</option>
        </select>
      </div>

      <p className="text-xs text-white/40">Cliente desde {formatarData(cliente.criado_em)}</p>

      <button
        type="submit"
        disabled={atualizar.isPending}
        className="rounded bg-brand px-4 py-2 text-sm font-semibold hover:bg-brand-dark disabled:opacity-60"
      >
        {atualizar.isPending ? "Salvando..." : "Salvar alterações"}
      </button>
    </form>
  );
}

function AbaAssinaturas({ clienteId }: { clienteId: number }) {
  const { data: assinatura, isLoading } = useAssinaturaCliente(clienteId);
  const atualizar = useUpdateAssinaturaCliente();

  const [status, setStatus] = useState<StatusAssinaturaAdmin>("ativa");
  const [expiracao, setExpiracao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    if (assinatura) {
      setStatus(assinatura.status);
      setExpiracao(paraDatetimeLocal(assinatura.data_expiracao));
    }
  }, [assinatura]);

  if (isLoading) return <p className="text-sm text-white/50">Carregando...</p>;
  if (!assinatura) {
    return (
      <p className="text-sm text-white/50">
        Esse cliente ainda não tem uma assinatura — atribua um plano na tabela de Clientes ou na página de
        Assinaturas.
      </p>
    );
  }

  async function salvar(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setSalvo(false);
    try {
      await atualizar.mutateAsync({ clienteId, data: { status, data_expiracao: deDatetimeLocal(expiracao) } });
      setSalvo(true);
    } catch {
      setErro("Não foi possível salvar.");
    }
  }

  return (
    <form onSubmit={salvar} className="space-y-4">
      {erro && <p className="text-sm text-red-300">{erro}</p>}
      {salvo && <p className="text-sm text-green-300">Assinatura atualizada.</p>}

      <div className="flex items-center justify-between rounded border border-white/10 bg-black/20 px-3 py-2">
        <span className="font-medium">{assinatura.plano_nome}</span>
        <span className={`rounded px-2 py-0.5 text-xs ${STATUS_ASSINATURA_ESTILO[assinatura.status]}`}>
          {assinatura.status}
        </span>
      </div>

      <div>
        <label className="mb-1 block text-xs text-white/60">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusAssinaturaAdmin)}
          className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-brand"
        >
          {STATUS_ASSINATURA_OPCOES.map((opcao) => (
            <option key={opcao} value={opcao}>
              {opcao}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs text-white/60">Vencimento</label>
        <input
          type="datetime-local"
          value={expiracao}
          onChange={(e) => setExpiracao(e.target.value)}
          className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-brand"
        />
      </div>

      <p className="text-xs text-white/40">
        Início: {formatarData(assinatura.data_inicio)} · Criada em: {formatarData(assinatura.criado_em)}
      </p>

      <button
        type="submit"
        disabled={atualizar.isPending}
        className="rounded bg-brand px-4 py-2 text-sm font-semibold hover:bg-brand-dark disabled:opacity-60"
      >
        {atualizar.isPending ? "Salvando..." : "Salvar alterações"}
      </button>
    </form>
  );
}
