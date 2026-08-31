import { ChevronLeft } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { CheckoutPagamento } from "@/components/cliente/CheckoutPagamento";
import { Skeleton } from "@/components/ui/Skeleton";
import { usePlanosPublicos } from "@/hooks/useAssinatura";

export function AssinaturaCheckout() {
  const { planoId: planoIdParam } = useParams<{ planoId: string }>();
  const planoId = Number(planoIdParam);
  const navigate = useNavigate();

  const { data: planos, isLoading } = usePlanosPublicos();
  const plano = planos?.find((p) => p.id === planoId);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-md px-4 pb-16 pt-24">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-4 h-40 w-full" />
      </div>
    );
  }

  if (!plano) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center text-white/60">
        <div>
          <p>Plano não encontrado.</p>
          <Link to="/assinatura" className="mt-3 inline-block text-brand hover:underline">
            Voltar pra assinatura
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-16 pt-24">
      <Link to="/assinatura" className="mb-4 inline-flex items-center gap-1 text-sm text-white/50 hover:text-white">
        <ChevronLeft size={16} />
        Voltar
      </Link>

      <CheckoutPagamento plano={plano} onSucesso={() => navigate("/", { replace: true })} />
    </div>
  );
}
