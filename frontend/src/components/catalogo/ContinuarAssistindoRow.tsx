import { Play } from "lucide-react";
import { Link } from "react-router-dom";

import type { ContinuarAssistindo } from "@/types/catalogo";

export function ContinuarAssistindoRow({ itens }: { itens: ContinuarAssistindo[] }) {
  if (itens.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="mb-2 px-4 text-lg font-semibold md:px-12">Continuar assistindo</h2>
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 md:px-12">
        {itens.map((item) => {
          const progresso =
            item.duracao_segundos && item.duracao_segundos > 0
              ? Math.min(100, Math.round((item.segundos_assistidos / item.duracao_segundos) * 100))
              : 0;

          return (
            <Link
              key={item.episodio_id}
              to={`/assistir/${item.episodio_id}`}
              className="group relative w-56 shrink-0 overflow-hidden rounded bg-surface-alt transition-transform hover:scale-105 md:w-64"
            >
              <div className="aspect-video w-full overflow-hidden bg-black/40">
                {item.thumbnail_url && (
                  <img src={item.thumbnail_url} alt="" className="h-full w-full object-cover" />
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                  <Play size={32} className="fill-white text-white" />
                </div>
              </div>
              <div className="h-1 w-full bg-white/20">
                <div className="h-full bg-brand" style={{ width: `${progresso}%` }} />
              </div>
              <div className="p-2">
                <p className="truncate text-xs text-white/50">{item.serie_titulo}</p>
                <p className="truncate text-sm font-medium">{item.episodio_titulo}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
