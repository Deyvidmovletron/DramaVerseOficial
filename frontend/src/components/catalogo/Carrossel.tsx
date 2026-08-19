import { Link } from "react-router-dom";

import { SerieCardItem } from "@/components/catalogo/SerieCardItem";
import type { Carrossel as CarrosselType } from "@/types/catalogo";

export function Carrossel({ carrossel }: { carrossel: CarrosselType }) {
  if (carrossel.series.length === 0) return null;

  return (
    <section className="mb-8">
      {carrossel.categoria_id !== null ? (
        <Link
          to={`/buscar?categoria_id=${carrossel.categoria_id}`}
          className="mb-2 inline-block px-4 text-lg font-semibold hover:text-white/80 md:px-12"
        >
          {carrossel.categoria} <span aria-hidden="true">›</span>
        </Link>
      ) : (
        <h2 className="mb-2 px-4 text-lg font-semibold md:px-12">{carrossel.categoria}</h2>
      )}
      <div className="flex gap-2 overflow-x-auto px-4 pb-2 md:gap-3 md:px-12">
        {carrossel.series.map((serie) => (
          <SerieCardItem key={serie.id} serie={serie} />
        ))}
      </div>
    </section>
  );
}
