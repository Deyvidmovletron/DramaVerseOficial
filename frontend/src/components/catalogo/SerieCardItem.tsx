import { useState } from "react";
import { Link } from "react-router-dom";

import type { SerieCard } from "@/types/catalogo";

export function SerieCardItem({ serie }: { serie: SerieCard }) {
  const [imagemComErro, setImagemComErro] = useState(false);
  const mostrarImagem = Boolean(serie.capa_url) && !imagemComErro;

  return (
    <Link
      to={`/serie/${serie.id}`}
      className="group w-36 shrink-0 transition-transform duration-200 hover:z-10 hover:scale-105 md:w-44"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded bg-surface-alt">
        {mostrarImagem ? (
          <img
            src={serie.capa_url!}
            alt={serie.titulo}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={() => setImagemComErro(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-2 text-center text-xs text-white/60">
            {serie.titulo}
          </div>
        )}
      </div>
      <p className="mt-1.5 truncate text-xs font-medium text-white/85 group-hover:text-white">{serie.titulo}</p>
    </Link>
  );
}
