import { type FormEvent, useState } from "react";

import { useClienteAuth } from "@/auth/ClienteAuthContext";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { useAtualizarPerfil, useLogoutTodosDispositivos, useTrocarSenha } from "@/hooks/useMinhaConta";

export function MinhaConta() {
  const { cliente, refetch, logout } = useClienteAuth();
  const atualizarPerfil = useAtualizarPerfil();
  const trocarSenha = useTrocarSenha();
  const logoutTodos = useLogoutTodosDispositivos();
  const { confirmar } = useConfirm();

  const [nome, setNome] = useState(cliente?.nome ?? "");
  const [email, setEmail] = useState(cliente?.email ?? "");
  const [erroPerfil, setErroPerfil] = useState<string | null>(null);
  const [sucessoPerfil, setSucessoPerfil] = useState(false);

  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacaoSenha, setConfirmacaoSenha] = useState("");
  const [erroSenha, setErroSenha] = useState<string | null>(null);
  const [sucessoSenha, setSucessoSenha] = useState(false);

  if (!cliente) return null;

  async function handleSalvarPerfil(event: FormEvent) {
    event.preventDefault();
    setErroPerfil(null);
    setSucessoPerfil(false);
    try {
      await atualizarPerfil.mutateAsync({ nome, email });
      await refetch();
      setSucessoPerfil(true);
    } catch {
      setErroPerfil("Não foi possível salvar (e-mail já usado por outra conta?).");
    }
  }

  async function handleTrocarSenha(event: FormEvent) {
    event.preventDefault();
    setErroSenha(null);
    setSucessoSenha(false);

    if (novaSenha !== confirmacaoSenha) {
      setErroSenha("As senhas não coincidem.");
      return;
    }

    try {
      await trocarSenha.mutateAsync({ senha_atual: senhaAtual, nova_senha: novaSenha });
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmacaoSenha("");
      setSucessoSenha(true);
    } catch {
      setErroSenha("Senha atual incorreta.");
    }
  }

  async function handleLogoutTodos() {
    const ok = await confirmar({
      message: "Isso vai encerrar sua sessão neste e em todos os outros dispositivos conectados. Continuar?",
      confirmLabel: "Sair de todos",
      danger: true,
    });
    if (!ok) return;
    await logoutTodos.mutateAsync();
    logout();
  }

  return (
    <div className="min-h-screen px-4 pb-16 pt-24 text-white md:px-12">
      <h1 className="mb-6 text-2xl font-semibold">Minha Conta</h1>

      <div className="mb-8 max-w-md rounded border border-white/10 bg-black/30 p-6">
        <h2 className="mb-4 text-lg font-semibold">Dados da conta</h2>
        <form onSubmit={handleSalvarPerfil} className="space-y-3">
          {erroPerfil && <p className="text-sm text-red-300">{erroPerfil}</p>}
          {sucessoPerfil && <p className="text-sm text-green-300">Dados atualizados com sucesso.</p>}
          <div>
            <label htmlFor="conta-nome" className="mb-1 block text-sm text-white/70">
              Nome
            </label>
            <input
              id="conta-nome"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
          <div>
            <label htmlFor="conta-email" className="mb-1 block text-sm text-white/70">
              E-mail
            </label>
            <input
              id="conta-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
          <button
            type="submit"
            disabled={atualizarPerfil.isPending}
            className="rounded bg-brand px-4 py-2 text-sm font-semibold hover:bg-brand-dark disabled:opacity-60"
          >
            {atualizarPerfil.isPending ? "Salvando..." : "Salvar"}
          </button>
        </form>
      </div>

      <div className="mb-8 max-w-md rounded border border-white/10 bg-black/30 p-6">
        <h2 className="mb-4 text-lg font-semibold">Trocar senha</h2>
        <form onSubmit={handleTrocarSenha} className="space-y-3">
          {erroSenha && <p className="text-sm text-red-300">{erroSenha}</p>}
          {sucessoSenha && <p className="text-sm text-green-300">Senha alterada com sucesso.</p>}
          <div>
            <label htmlFor="conta-senha-atual" className="mb-1 block text-sm text-white/70">
              Senha atual
            </label>
            <input
              id="conta-senha-atual"
              type="password"
              required
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
          <div>
            <label htmlFor="conta-nova-senha" className="mb-1 block text-sm text-white/70">
              Nova senha
            </label>
            <input
              id="conta-nova-senha"
              type="password"
              required
              minLength={6}
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
          <div>
            <label htmlFor="conta-confirmacao-senha" className="mb-1 block text-sm text-white/70">
              Confirme a nova senha
            </label>
            <input
              id="conta-confirmacao-senha"
              type="password"
              required
              minLength={6}
              value={confirmacaoSenha}
              onChange={(e) => setConfirmacaoSenha(e.target.value)}
              className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
          <button
            type="submit"
            disabled={trocarSenha.isPending}
            className="rounded bg-brand px-4 py-2 text-sm font-semibold hover:bg-brand-dark disabled:opacity-60"
          >
            {trocarSenha.isPending ? "Salvando..." : "Trocar senha"}
          </button>
        </form>
      </div>

      <div className="max-w-md rounded border border-white/10 bg-black/30 p-6">
        <h2 className="mb-2 text-lg font-semibold">Sessões</h2>
        <p className="mb-4 text-sm text-white/60">
          Encerra o acesso em todos os dispositivos conectados com esta conta, incluindo este.
        </p>
        <button
          onClick={handleLogoutTodos}
          disabled={logoutTodos.isPending}
          className="rounded bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20 disabled:opacity-60"
        >
          Sair de todos os dispositivos
        </button>
      </div>
    </div>
  );
}
