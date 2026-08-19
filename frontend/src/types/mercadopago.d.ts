// Tipagem mínima do SDK do Mercado Pago (window.MercadoPago), carregado via
// <script src="https://sdk.mercadopago.com/js/v2"> — cobre só o que este app usa
// (Payment Brick, pra tokenizar cartão). O SDK não publica tipos oficiais.

interface MercadoPagoBrickPayerIdentification {
  type: string;
  number: string;
}

interface MercadoPagoBrickFormData {
  token?: string;
  issuer_id?: string;
  payment_method_id?: string;
  installments?: number;
  payer?: {
    email?: string;
    identification?: MercadoPagoBrickPayerIdentification;
  };
}

interface MercadoPagoBrickController {
  unmount: () => void;
}

interface MercadoPagoBricksBuilder {
  create: (
    tipo: "payment",
    containerId: string,
    settings: {
      initialization: {
        amount: number;
        payer?: { email?: string };
      };
      customization: {
        paymentMethods: {
          creditCard?: "all";
          debitCard?: "all";
          bankTransfer?: "all";
          maxInstallments?: number;
        };
        visual?: { style?: { theme?: "dark" | "default" | "flat" | "bootstrap" } };
      };
      callbacks: {
        onReady?: () => void;
        onSubmit: (params: { formData: MercadoPagoBrickFormData }) => Promise<void>;
        onError?: (error: unknown) => void;
      };
    },
  ) => Promise<MercadoPagoBrickController>;
}

interface MercadoPagoInstance {
  bricks: () => MercadoPagoBricksBuilder;
}

interface MercadoPagoConstructor {
  new (publicKey: string, options?: { locale?: string }): MercadoPagoInstance;
}

interface Window {
  MercadoPago?: MercadoPagoConstructor;
}
