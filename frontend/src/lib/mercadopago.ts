const SDK_URL = "https://sdk.mercadopago.com/js/v2";

let sdkPromise: Promise<void> | null = null;
let publicKeyPromise: Promise<string> | null = null;

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

/** Busca a chave PÚBLICA do Mercado Pago no backend (rota aberta `/api/v1/config`) em
 * vez de embuti-la no bundle em tempo de build — assim ela é configurada só no
 * backend-stack.yml (MERCADOPAGO_PUBLIC_KEY), junto do access token. Resultado é
 * cacheado (uma chamada por sessão); em caso de falha, a promise é descartada pra
 * permitir nova tentativa. */
function obterPublicKey(): Promise<string> {
  if (publicKeyPromise) return publicKeyPromise;

  publicKeyPromise = (async () => {
    const resp = await fetch("/api/v1/config");
    if (!resp.ok) {
      throw new Error(`Falha ao obter configuração do pagamento (HTTP ${resp.status}).`);
    }
    const dados: { mercadopago_public_key?: string } = await resp.json();
    if (!dados.mercadopago_public_key) {
      throw new Error("Pagamento indisponível: chave pública do Mercado Pago não configurada no backend.");
    }
    return dados.mercadopago_public_key;
  })().catch((erro) => {
    publicKeyPromise = null;
    throw erro;
  });

  return publicKeyPromise;
}

export async function criarInstanciaMercadoPago(): Promise<MercadoPagoInstance> {
  const [publicKey] = await Promise.all([obterPublicKey(), carregarSdkMercadoPago()]);

  if (!window.MercadoPago) {
    throw new Error("SDK do Mercado Pago carregou, mas MercadoPago não está definido.");
  }

  return new window.MercadoPago(publicKey, { locale: "pt-BR" });
}
