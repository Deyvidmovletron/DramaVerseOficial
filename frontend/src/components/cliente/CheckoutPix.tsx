import { Check, Copy, Loader2, QrCode } from "lucide-react";
import { useEffect, useState } from "react";

import { useCheckoutPix, useVerificarPagamento } from "@/hooks/useAssinatura";

interface CheckoutPixProps {
  planoId: number;
  onAprovado: () => void;
  onErro: (mensagem: string) => void;
}

/** PIX não tem cobrança recorrente no Mercado Pago — gera um pagamento avulso pro
 * período atual do plano e faz polling até aprovar (o webhook confirma em paralelo,
 * o que chegar primeiro). Renovação de período seguinte é um novo PIX, manual. */
export function CheckoutPix({ planoId, onAprovado, onErro }: CheckoutPixProps) {
  const checkoutPix = useCheckoutPix();
  const [assinaturaId, setAssinaturaId] = useState<number | null>(null);
  const [copiado, setCopiado] = useState(false);
  const verificarPagamento = useVerificarPagamento(assinaturaId);

  useEffect(() => {
    checkoutPix.mutate(planoId, {
      onSuccess: (resultado) => setAssinaturaId(resultado.assinatura_id),
      onError: () => onErro("Não foi possível gerar o PIX agora. Tente novamente."),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planoId]);

  useEffect(() => {
    if (verificarPagamento.data?.ativa) onAprovado();
  }, [verificarPagamento.data?.ativa, onAprovado]);

  async function copiarCodigo() {
    if (!checkoutPix.data?.qr_code) return;
    await navigator.clipboard.writeText(checkoutPix.data.qr_code);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  if (checkoutPix.isPending || !checkoutPix.data) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-white/50">
        <Loader2 size={18} className="animate-spin" />
        Gerando QR Code do PIX...
      </div>
    );
  }

  if (!checkoutPix.data.qr_code_base64) {
    return (
      <div className="rounded border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
        Não foi possível gerar o QR Code do PIX. Tente novamente ou use o cartão.
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="rounded-lg bg-white p-3">
        <img
          src={`data:image/png;base64,${checkoutPix.data.qr_code_base64}`}
          alt="QR Code do PIX"
          className="h-48 w-48"
        />
      </div>

      <button
        onClick={copiarCodigo}
        className="flex items-center gap-2 rounded border border-white/20 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10"
      >
        {copiado ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
        {copiado ? "Código copiado" : "Copiar código (copia e cola)"}
      </button>

      <div className="flex items-center gap-2 text-sm text-white/50">
        <QrCode size={16} />
        Abra o app do seu banco, escaneie o QR Code ou cole o código copia e cola.
      </div>

      <div className="flex items-center gap-2 rounded bg-white/5 px-4 py-2 text-sm text-white/60">
        <Loader2 size={14} className="animate-spin" />
        Aguardando confirmação do pagamento...
      </div>
    </div>
  );
}
