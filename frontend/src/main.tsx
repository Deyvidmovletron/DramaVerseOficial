import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { App } from "@/App.tsx";
import { AdminAuthProvider } from "@/auth/AdminAuthContext";
import { ClienteAuthProvider } from "@/auth/ClienteAuthContext";
import { ConfirmProvider } from "@/components/ui/ConfirmProvider";
import "@/index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ConfirmProvider>
          <ClienteAuthProvider>
            <AdminAuthProvider>
              <App />
            </AdminAuthProvider>
          </ClienteAuthProvider>
        </ConfirmProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
