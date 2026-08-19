import { type KeyboardEvent, type ReactNode, createContext, useCallback, useContext, useEffect, useState } from "react";

interface DialogOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface DialogState extends DialogOptions {
  tipo: "confirm" | "alert";
  resolve: (value: boolean) => void;
}

interface ConfirmContextValue {
  confirmar: (options: DialogOptions | string) => Promise<boolean>;
  alertar: (options: DialogOptions | string) => Promise<void>;
}

const ConfirmContext = createContext<ConfirmContextValue | undefined>(undefined);

function normalizar(options: DialogOptions | string): DialogOptions {
  return typeof options === "string" ? { message: options } : options;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState | null>(null);

  const confirmar = useCallback((options: DialogOptions | string) => {
    return new Promise<boolean>((resolve) => {
      setState({ ...normalizar(options), tipo: "confirm", resolve });
    });
  }, []);

  const alertar = useCallback((options: DialogOptions | string) => {
    return new Promise<boolean>((resolve) => {
      setState({ ...normalizar(options), tipo: "alert", resolve });
    }).then(() => undefined);
  }, []);

  function fechar(resultado: boolean) {
    state?.resolve(resultado);
    setState(null);
  }

  useEffect(() => {
    if (!state) return;
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") fechar(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function handleBackdropKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") fechar(false);
  }

  return (
    <ConfirmContext.Provider value={{ confirmar, alertar }}>
      {children}
      {state && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4"
          role="presentation"
          onClick={() => fechar(false)}
          onKeyDown={handleBackdropKeyDown}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-message"
            className="w-full max-w-sm rounded border border-white/10 bg-surface p-6 text-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="confirm-dialog-title" className="mb-2 text-lg font-semibold">
              {state.title ?? (state.tipo === "alert" ? "Aviso" : "Confirmar ação")}
            </h2>
            <p id="confirm-dialog-message" className="mb-6 text-sm text-white/70">
              {state.message}
            </p>
            <div className="flex justify-end gap-3">
              {state.tipo === "confirm" && (
                <button
                  onClick={() => fechar(false)}
                  className="rounded bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20"
                >
                  {state.cancelLabel ?? "Cancelar"}
                </button>
              )}
              <button
                autoFocus
                onClick={() => fechar(true)}
                className={`rounded px-4 py-2 text-sm font-semibold ${
                  state.danger
                    ? "bg-red-600 hover:bg-red-500"
                    : "bg-brand hover:bg-brand-dark"
                }`}
              >
                {state.confirmLabel ?? (state.tipo === "alert" ? "OK" : "Confirmar")}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmContextValue {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm deve ser usado dentro de ConfirmProvider");
  return ctx;
}
