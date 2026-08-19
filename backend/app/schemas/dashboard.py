from pydantic import BaseModel


class DashboardOut(BaseModel):
    total_clientes: int
    clientes_ativos: int
    clientes_bloqueados: int
    total_series: int
    total_episodios: int
    assinaturas_ativas: int
    assinaturas_atrasadas: int
    novas_assinaturas_mes: int
    receita_mes_centavos: int
