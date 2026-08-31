import { Check, Sparkles } from "lucide-react";

import type { PlanoPublico } from "@/types/catalogo";

function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

function centavosParaReais(centavos: number): string {
  return (centavos / 100).toFixed(2).replace(".", ",");
}

/** Descrição pode vir com benefícios separados por quebra de linha ou ";" — vira lista. */
function beneficios(descricao: string | null): string[] {
  if (!descricao) return [];
  return descricao
    .split(/[\n;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

interface PlanoSelecaoProps {
  planos: PlanoPublico[];
  selecionadoId: number | null;
  onSelecionar: (id: number) => void;
  /** Mostra o selo "X dias grátis" no card. Desligue quando o cliente já usou o teste. */
  mostrarSeloTeste?: boolean;
}

interface CardProps {
  plano: PlanoPublico;
  selecionado: boolean;
  onSelecionar: (id: number) => void;
  destaque?: boolean;
  mostrarSeloTeste?: boolean;
}

function SeloTeste({ dias }: { dias: number }) {
  if (dias <= 0) return null;
  return (
    <span className="inline-flex w-fit rounded bg-green-500/20 px-2 py-0.5 text-xs font-semibold text-green-300">
      {dias} {dias === 1 ? "dia" : "dias"} grátis
    </span>
  );
}

function Radio({ selecionado }: { selecionado: boolean }) {
  return (
    <span
      className={cx(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
        selecionado ? "border-brand bg-brand text-white" : "border-white/30",
      )}
    >
      {selecionado && <Check size={12} />}
    </span>
  );
}

/** Card compacto (vertical) — usado nas grades de 2, 3 e 4+ planos. */
function PlanoCard({ plano, selecionado, onSelecionar, destaque, mostrarSeloTeste = true }: CardProps) {
  const itens = beneficios(plano.descricao);
  return (
    <button
      type="button"
      onClick={() => onSelecionar(plano.id)}
      aria-pressed={selecionado}
      className={cx(
        "relative flex h-full flex-col rounded-xl border p-5 text-left transition",
        selecionado
          ? "border-brand bg-brand/10 ring-2 ring-brand"
          : "border-white/10 bg-black/30 hover:border-white/30",
      )}
    >
      {destaque && (
        <span className="absolute -top-3 left-5 flex items-center gap-1 rounded-full bg-brand px-2.5 py-0.5 text-xs font-semibold text-white">
          <Sparkles size={12} />
          Recomendado
        </span>
      )}

      <div className="flex items-start justify-between">
        <h3 className="text-lg font-semibold text-white">{plano.nome}</h3>
        <Radio selecionado={selecionado} />
      </div>

      <p className="mt-3 text-2xl font-bold text-white">
        R$ {centavosParaReais(plano.preco_centavos)}
        <span className="text-sm font-normal text-white/50"> / mês</span>
      </p>

      {mostrarSeloTeste && (
        <div className="mt-2">
          <SeloTeste dias={plano.periodo_teste_dias} />
        </div>
      )}

      {itens.length > 0 ? (
        <ul className="mt-4 space-y-1.5">
          {itens.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-white/70">
              <Check size={15} className="mt-0.5 shrink-0 text-brand" />
              {item}
            </li>
          ))}
        </ul>
      ) : (
        plano.descricao && <p className="mt-4 text-sm text-white/60">{plano.descricao}</p>
      )}
    </button>
  );
}

/** Card largo (horizontal em telas médias) — usado quando há um único plano, para
 * ocupar 100% da largura sem ficar "perdido" no meio da tela. */
function PlanoCardUnico({ plano, selecionado, onSelecionar, mostrarSeloTeste = true }: CardProps) {
  const itens = beneficios(plano.descricao);
  return (
    <button
      type="button"
      onClick={() => onSelecionar(plano.id)}
      aria-pressed={selecionado}
      className={cx(
        "flex w-full flex-col gap-6 rounded-2xl border p-6 text-left transition md:flex-row md:items-center md:justify-between md:p-8",
        selecionado
          ? "border-brand bg-brand/10 ring-2 ring-brand"
          : "border-white/10 bg-black/30 hover:border-white/30",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <h3 className="text-2xl font-bold text-white">{plano.nome}</h3>
          {mostrarSeloTeste && <SeloTeste dias={plano.periodo_teste_dias} />}
        </div>

        {itens.length > 0 ? (
          <ul className="mt-4 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
            {itens.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-white/70">
                <Check size={15} className="mt-0.5 shrink-0 text-brand" />
                {item}
              </li>
            ))}
          </ul>
        ) : (
          plano.descricao && <p className="mt-3 text-sm text-white/60">{plano.descricao}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-4 border-white/10 md:flex-col md:items-end md:gap-2 md:border-l md:pl-8">
        <p className="text-3xl font-bold text-white">
          R$ {centavosParaReais(plano.preco_centavos)}
          <span className="text-sm font-normal text-white/50"> / mês</span>
        </p>
        <span
          className={cx(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold",
            selecionado ? "bg-brand text-white" : "border border-white/20 text-white/70",
          )}
        >
          <Radio selecionado={selecionado} />
          {selecionado ? "Selecionado" : "Selecionar"}
        </span>
      </div>
    </button>
  );
}

/** Seleção de plano. O conteúdo sempre ocupa 100% da largura disponível:
 * 1 → card largo · 2 → duas colunas · 3 → três colunas · 4+ → grade responsiva. */
export function PlanosSelecao({
  planos,
  selecionadoId,
  onSelecionar,
  mostrarSeloTeste = true,
}: PlanoSelecaoProps) {
  if (planos.length === 0) {
    return <p className="text-white/50">Nenhum plano disponível no momento.</p>;
  }

  const cardProps = (plano: PlanoPublico): CardProps => ({
    plano,
    selecionado: plano.id === selecionadoId,
    onSelecionar,
    destaque: plano.destaque,
    mostrarSeloTeste,
  });

  if (planos.length === 1) {
    return <PlanoCardUnico {...cardProps(planos[0])} />;
  }

  // 2 e 3 planos: uma coluna por plano (ocupando a largura toda) a partir do tablet.
  // 4+: grade responsiva que quebra em linhas.
  const colunas =
    planos.length === 2 ? "sm:grid-cols-2" : planos.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className={cx("grid w-full gap-4", colunas)}>
      {planos.map((plano) => (
        <PlanoCard key={plano.id} {...cardProps(plano)} />
      ))}
    </div>
  );
}
