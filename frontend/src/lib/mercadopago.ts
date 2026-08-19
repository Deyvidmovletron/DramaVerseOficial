const SDK_URL = "https://sdk.mercadopago.com/js/v2";

let sdkPromise: Promise<void> | null = null;

/** Injeta o <script> do SDK do Mercado Pago uma única vez (idempotente — chamadas
 * concorrentes reaproveitam a mesma promise) e resolve quando `window.MercadoPago`
 * estiver disponível. Carregado sob demanda (só na tela de checkout), não no app inteiro. */
function carregarSdkMercadoPago(): Promise<void> {
  if (window.MercadoPago) return Promise.resolve();
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      sdkPromise = null;
      reject(new Error("Não foi possível carregar o SDK do Mercado Pago."));
    };
    document.head.appendChild(script);
  });

  return sdkPromise;
}

export async function criarInstanciaMercadoPago(): Promise<MercadoPagoInstance> {
  const publicKey = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY;
  if (!publicKey) {
    throw new Error("Pagamento indisponível: chave pública do Mercado Pago não configurada.");
  }

  await carregarSdkMercadoPago();
  if (!window.MercadoPago) {
    throw new Error("SDK do Mercado Pago carregou, mas MercadoPago não está definido.");
  }

  return new window.MercadoPago(publicKey, { locale: "pt-BR" });
}
