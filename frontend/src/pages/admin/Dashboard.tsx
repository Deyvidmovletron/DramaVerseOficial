import {
  AlertTriangle,
  CreditCard,
  Film,
  ListVideo,
  ShieldOff,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import type { ComponentType } from "react";

import { Skeleton } from "@/components/ui/Skeleton";
import { useDashboard } from "@/hooks/useDashboard";

function centavosParaReais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface CardProps {
  label: string;
  value: string | number;
  icon: ComponentType<{ size?: number; className?: string }>;
  tone?: "default" | "green" | "yellow" | "red";
}

function MetricCard({ label, value, icon: Icon, tone = "default" }: CardProps) {
  const toneClasses: Record<string, string> = {
    default: "text-white",
    green: "text-green-400",
    yellow: "text-yellow-400",
    red: "text-red-400",
  };

  return (
    <div className="flex items-center gap-4 rounded border border-white/10 bg-black/30 p-5">
      <div className="rounded-full bg-white/10 p-3">
        <Icon size={20} className={toneClasses[tone]} />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-white/60">{label}</p>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded border border-white/10 bg-black/30 p-5">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminDashboard() {
  const { data, isLoading } = useDashboard();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Dashboard</h1>

      {isLoading || !data ? (
        <DashboardSkeleton />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Receita do mês" value={centavosParaReais(data.receita_mes_centavos)} icon={Wallet} tone="green" />
          <MetricCard label="Novas assinaturas (mês)" value={data.novas_assinaturas_mes} icon={CreditCard} />
          <MetricCard label="Assinaturas ativas" value={data.assinaturas_ativas} icon={UserCheck} tone="green" />
          <MetricCard label="Assinaturas atrasadas" value={data.assinaturas_atrasadas} icon={AlertTriangle} tone="yellow" />
          <MetricCard label="Total de clientes" value={data.total_clientes} icon={Users} />
          <MetricCard label="Clientes com conta bloqueada" value={data.clientes_bloqueados} icon={ShieldOff} tone="red" />
          <MetricCard label="Séries cadastradas" value={data.total_series} icon={Film} />
          <MetricCard label="Episódios cadastrados" value={data.total_episodios} icon={ListVideo} />
        </div>
      )}
    </div>
  );
}
