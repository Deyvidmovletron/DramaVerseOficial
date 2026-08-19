import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { useCheckoutCartao } from "@/hooks/useAssinatura";
import { criarInstanciaMercadoPago } from "@/lib/mercadopago";
import type { CheckoutCartaoResultado } from "@/types/catalogo";

const CONTAINER_ID = "mp-brick-cartao";

interface CheckoutCartaoBrickProps {
  planoId: number;
  valorReais: number;
  onResultado: (resultado: CheckoutCartaoResultado) => void;
  onErro: (mensagem: string) => void;
}

/** Monta o Payment Brick do Mercado Pago só pra tokenizar o cartão — o token vai pro
 * nosso backend criar a assinatura (preapproval), nunca pra um /payment. O número do
 * cartão nunca passa por este servidor, só o token gerado pelo próprio SDK do MP. */
export function CheckoutCartaoBrick({ planoId, valorReais, onResultado, onErro }: CheckoutCartaoBrickProps) {
  const [carregando, setCarregando] = useState(true);
  const [indisponivel, setIndisponivel] = useState(false);
  const checkoutCartao = useCheckoutCartao();

  useEffect(() => {
    let cancelado = false;
    let controller: MercadoPagoBrickController | null = null;

    async function montar() {
      try {
        const mp = await criarInstanciaMercadoPago();
        if (cancelado) return;

        controller = await mp.bricks().create("payment", CONTAINER_ID, {
          initialization: { amount: valorReais },
          customization: {
            paymentMethods: { creditCard: "all", maxInstallments: 1 },
            visual: { style: { theme: "dark" } },
          },
          callbacks: {
            onReady: () => {
              if (!cancelado) setCarregando(false);
            },
            onError: () => {
              if (!cancelado) {
                setIndisponivel(true);
                setCarregando(false);
              }
            },
            onSubmit: ({ formData }) =>
              new Promise((resolve, reject) => {
                if (!formData.token) {
                  onErro("Não foi possível processar os dados do cartão. Tente novamente.");
                  reject(new Error("sem token"));
                  return;
                }
                checkoutCartao.mutate(
                  {
                    plano_id: planoId,
                    card_token_id: formData.token,
                    cpf: formData.payer?.identification?.number,
                  },
                  {
                    onSuccess: (resultado) => {
                      resolve();
                      onResultado(resultado);
                    },
                    onError: () => {
                      onErro("Não foi possível processar o pagamento. Tente novamente em instantes.");
                      reject(new Error("falha no checkout"));
                    },
                  },
                );
              }),
          },
        });
      } catch {
        if (!cancelado) {
          setIndisponivel(true);
          setCarregando(false);
        }
      }
    }

    void montar();
    return () => {
      cancelado = true;
      controller?.unmount();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planoId, valorReais]);

  if (indisponivel) {
    return (
      <div className="flex items-start gap-2 rounded border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
        <AlertCircle size={18} className="mt-0.5 shrink-0" />
        Não foi possível carregar o pagamento por cartão agora. Tente novamente mais tarde ou use o PIX.
      </div>
    );
  }

  return (
    <div>
      {carregando && (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-white/50">
          <Loader2 size={18} className="animate-spin" />
          Carregando formulário de pagamento...
        </div>
      )}
      <div id={CONTAINER_ID} className={carregando ? "hidden" : undefined} />
    </div>
  );
}
