import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, TrendingUp, BarChart3, Receipt } from "lucide-react";
import { Proposal, formatCurrency } from "./types";

interface Props {
  proposals: Proposal[];
}

const DashboardKPIs = ({ proposals }: Props) => {
  const all = proposals;
  const closed = all.filter((p) => p.status === "fechada");

  // 1. Faturamento Bruto = soma total_price das fechadas
  const faturamentoBruto = closed.reduce((s, p) => s + p.total_price, 0);

  // 2. Faturamento Líquido = bruto - custos dos modelos
  const faturamentoLiquido = closed.reduce((s, p) => {
    const cost = p.pool_models?.cost || 0;
    return s + (p.total_price - cost);
  }, 0);

  // 3. Taxa de Conversão FV = fechadas / (total - novas)
  const totalWorked = all.filter((p) => p.status !== "nova").length;
  const conversionRate = totalWorked > 0 ? (closed.length / totalWorked) * 100 : 0;

  // 4. Ticket Médio = bruto / qtd fechadas
  const ticketMedio = closed.length > 0 ? faturamentoBruto / closed.length : 0;

  // Secondary metrics
  const avgClosingDays = closed.length > 0
    ? closed.reduce((s, p) => {
        const days = Math.floor((Date.now() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24));
        return s + days;
      }, 0) / closed.length
    : 0;

  const lostCount = all.filter((p) => p.status === "perdida").length;
  const lossRate = all.length > 0 ? (lostCount / all.length) * 100 : 0;

  const marginPct = faturamentoBruto > 0 ? (faturamentoLiquido / faturamentoBruto) * 100 : 0;

  const kpis = [
    {
      label: "Faturamento Bruto",
      value: formatCurrency(faturamentoBruto),
      subtitle: closed.length > 0 ? `${closed.length} venda${closed.length > 1 ? "s" : ""} fechada${closed.length > 1 ? "s" : ""}` : undefined,
      icon: DollarSign,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-600",
    },
    {
      label: "Faturamento Líquido",
      value: formatCurrency(faturamentoLiquido),
      subtitle: faturamentoBruto > 0 ? `margem ${marginPct.toFixed(1)}%` : undefined,
      icon: TrendingUp,
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-600",
    },
    {
      label: "Taxa de Conversão FV",
      value: `${conversionRate.toFixed(1)}%`,
      subtitle: totalWorked > 0 ? `${closed.length}/${totalWorked} trabalhadas` : undefined,
      icon: BarChart3,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      label: "Ticket Médio",
      value: formatCurrency(ticketMedio),
      subtitle: closed.length > 0 ? `base: ${closed.length} venda${closed.length > 1 ? "s" : ""}` : undefined,
      icon: Receipt,
      iconBg: "bg-violet-500/10",
      iconColor: "text-violet-600",
    },
  ];

  return (
    <div className="space-y-3 md:space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="border-border/50">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground uppercase tracking-wider leading-tight">
                      {kpi.label}
                    </p>
                    <p className="text-base sm:text-2xl font-bold mt-0.5 md:mt-1 truncate">{kpi.value}</p>
                    {kpi.subtitle && (
                      <p className="text-[10px] md:text-[11px] text-muted-foreground mt-0.5">{kpi.subtitle}</p>
                    )}
                  </div>
                  <div className={`hidden sm:flex h-9 w-9 rounded-lg ${kpi.iconBg} items-center justify-center shrink-0`}>
                    <Icon className={`h-4 w-4 ${kpi.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardKPIs;
