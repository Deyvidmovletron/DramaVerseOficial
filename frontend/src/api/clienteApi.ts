import { createApi } from "@/api/authApi";

export const clienteApi = createApi({
  scope: "cliente",
  loginPath: "/login",
  blockedPath: "/assinatura/bloqueado",
  fallbackScope: "admin",
});
