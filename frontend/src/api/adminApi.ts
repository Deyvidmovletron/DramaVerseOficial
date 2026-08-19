import { createApi } from "@/api/authApi";

export const adminApi = createApi({
  scope: "admin",
  loginPath: "/admin/login",
});
