import { useMutation, useQuery } from "@tanstack/react-query";

import { clienteApi } from "@/api/clienteApi";
import type {
  CheckoutCartaoResultado,
  CheckoutPixResultado,
  PlanoPublico,
  VerificarPagamentoResultado,
} from "@/types/catalogo";

export function usePlanosPublicos() {
  return useQuery({
    queryKey: ["planos-publicos"],
    queryFn: async () => (await clienteApi.get<PlanoPublico[]>("/planos/publicos")).data,
  });
}

/** Fluxo legado: redirect pro checkout hospedado pelo Mercado Pago. Mantido como
 * alternativa ao checkout embutido (useCheckoutCartao/useCheckoutPix). */
export function useCheckout() {
  return useMutation({
    mutationFn: async (planoId: number) =>
      (await clienteApi.post<{ checkout_url: string }>("/assinaturas/checkout", { plano_id: planoId })).data,
  });
}

interface CheckoutCartaoInput {
  plano_id: number;
  card_token_id: string;
  payer_first_name?: string;
  payer_last_name?: string;
  cpf?: string;
}

export function useCheckoutCartao() {
  return useMutation({
    mutationFn: async (data: CheckoutCartaoInput) =>
      (await clienteApi.post<CheckoutCartaoResultado>("/assinaturas/checkout/cartao", data)).data,
  });
}

export function useCheckoutPix() {
  return useMutation({
    mutationFn: async (planoId: number) =>
      (await clienteApi.post<CheckoutPixResultado>("/assinaturas/checkout/pix", { plano_id: planoId })).data,
  });
}

export function useVerificarPagamento(assinaturaId: number | null, opcoes?: { intervaloMs?: number }) {
  return useQuery({
    queryKey: ["assinatura", "verificar-pagamento", assinaturaId],
    queryFn: async () =>
      (await clienteApi.get<VerificarPagamentoResultado>(`/assinaturas/${assinaturaId}/verificar-pagamento`)).data,
    enabled: assinaturaId !== null,
    refetchInterval: (query) => (query.state.data?.ativa ? false : (opcoes?.intervaloMs ?? 3000)),
  });
}
