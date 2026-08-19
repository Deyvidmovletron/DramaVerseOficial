import { useQuery } from "@tanstack/react-query";

import { adminApi } from "@/api/adminApi";

export interface Dashboard {
  total_clientes: number;
  clientes_ativos: number;
  clientes_bloqueados: number;
  total_series: number;
  total_episodios: number;
  assinaturas_ativas: number;
  assinaturas_atrasadas: number;
  novas_assinaturas_mes: number;
  receita_mes_centavos: number;
}

export function useDashboard() {
  return useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => (await adminApi.get<Dashboard>("/admin/dashboard")).data,
    refetchInterval: 30_000,
  });
}
