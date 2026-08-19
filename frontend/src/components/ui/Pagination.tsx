import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  pagina: number;
  totalPaginas: number;
  total: number;
  onChange: (pagina: number) => void;
}

export function Pagination({ pagina, totalPaginas, total, onChange }: PaginationProps) {
  if (totalPaginas <= 1) return null;

  return (
    <div className="mt-4 flex flex-col items-center gap-3 text-sm text-white/60 sm:flex-row sm:justify-between">
      <span>{total} resultado(s)</span>
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={() => onChange(pagina - 1)}
          disabled={pagina <= 1}
          className="flex items-center gap-1 rounded bg-white/10 px-3 py-1.5 font-semibold hover:bg-white/20 disabled:opacity-40"
        >
          <ChevronLeft size={14} />
          <span className="hidden sm:inline">Anterior</span>
        </button>
        <span className="whitespace-nowrap">
          Página {pagina} de {totalPaginas}
        </span>
        <button
          onClick={() => onChange(pagina + 1)}
          disabled={pagina >= totalPaginas}
          className="flex items-center gap-1 rounded bg-white/10 px-3 py-1.5 font-semibold hover:bg-white/20 disabled:opacity-40"
        >
          <span className="hidden sm:inline">Próxima</span>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
