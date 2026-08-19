import { Info } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import type { SerieCard } from "@/types/catalogo";

const INTERVALO_MS = 6000;

const SINOPSE_PADRAO = "Assista agora e descubra por que esta produção está em destaque no catálogo.";

function SlideBanner({ serie }: { serie: SerieCard }) {
  const [imagemComErro, setImagemComErro] = useState(false);
  const mostrarImagem = Boolean(serie.banner_url) && !imagemComErro;

  if (!mostrarImagem) {
    return <div className="h-full w-full bg-gradient-to-br from-surface-alt to-black" />;
  }

  return (
    // Em telas largas a imagem some pra caber os 100% de largura do hero, o que estica e
    // pixela banners de origem menor (ex: capa de playlist do YouTube, 16:9). Em vez disso,
    // a imagem ocupa só a metade direita (no seu aspect ratio real) e a esquerda fica sólida
    // — com um degradê costurando as duas partes.
    <div className="flex h-full w-full">
      <div className="hidden w-1/2 shrink-0 bg-bg md:block" />
      <div className="relative h-full w-full md:w-1/2">
        <img
          src={serie.banner_url!}
          alt={serie.titulo}
          className="h-full w-full object-cover"
          onError={() => setImagemComErro(true)}
        />
        <div className="absolute inset-y-0 left-0 hidden w-1/3 bg-gradient-to-r from-bg to-transparent md:block" />
      </div>
    </div>
  );
}

export function HeroSlider({ series }: { series: SerieCard[] }) {
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    setIndice(0);
  }, [series]);

  useEffect(() => {
    if (series.length <= 1 || pausado) return;
    const timer = setInterval(() => {
      setIndice((atual) => (atual + 1) % series.length);
    }, INTERVALO_MS);
    return () => clearInterval(timer);
  }, [series.length, pausado]);

  if (series.length === 0) return null;

  return (
    <div
      className="relative h-[60vh] min-h-[380px] max-h-[720px] w-full overflow-hidden text-white"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
      onTouchStart={() => setPausado(true)}
    >
      {series.map((serie, i) => (
        <div
          key={serie.id}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            i === indice ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <SlideBanner serie={serie} />
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/20 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/10 to-transparent" />

          <div className="relative z-10 flex h-full flex-col justify-end gap-3 px-4 pb-12 md:w-1/2 md:justify-center md:gap-4 md:px-12 md:pb-0">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand">
              <span className="h-px w-6 bg-brand" />
              Série em destaque
            </span>

            <h1 className="max-w-xl text-3xl font-bold drop-shadow-lg md:max-w-none md:text-5xl">{serie.titulo}</h1>

            {serie.ano && (
              <p className="flex items-center gap-2 text-sm text-white/70">
                <span className="rounded border border-white/30 px-1.5 py-0.5 text-xs font-medium">{serie.ano}</span>
              </p>
            )}

            <p className="line-clamp-3 max-w-md text-sm leading-relaxed text-white/70">
              {serie.sinopse?.trim() || SINOPSE_PADRAO}
            </p>

            <Link
              to={`/serie/${serie.id}`}
              className="flex w-fit items-center gap-2 rounded bg-white/20 px-5 py-2.5 text-sm font-semibold backdrop-blur-sm transition hover:bg-white/30"
            >
              <Info size={18} />
              Mais informações
            </Link>
          </div>
        </div>
      ))}

      {series.length > 1 && (
        <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2 md:bottom-6">
          {series.map((serie, i) => (
            <button
              key={serie.id}
              type="button"
              onClick={() => setIndice(i)}
              aria-label={`Ver ${serie.titulo}`}
              className={`h-1.5 rounded-full transition-all ${
                i === indice ? "w-6 bg-white" : "w-1.5 bg-white/40 hover:bg-white/60"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
