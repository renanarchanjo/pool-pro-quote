import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Target, Receipt, BarChart3 } from "lucide-react";
import { Proposal, ProposalStatus, STATUS_PROBABILITY, formatCurrency } from "./types";
import { startOfMonth, subMonths, endOfMonth } from "date-fns";

interface Props {
  proposals: Proposal[];
}

const DashboardKPIs = ({ proposals }: Props) => {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  const thisMonth = proposals.filter((p) => new Date(p.created_at) >= monthStart);
  const lastMonth = proposals.filter(
    (p) => new Date(p.created_at) >= lastMonthStart && new Date(p.created_at) <= lastMonthEnd
  );

  // Revenue closed this month
  const revenueClosed = thisMonth
    .filter((p) => p.status === "fechada")
    .reduce((s, p) => s + p.total_price, 0);

  const revenueClosedLast = lastMonth
    .filter((p) => p.status === "fechada")
    .reduce((s, p) => s + p.total_price, 0);

  // Predicted revenue (open proposals * probability)
  const revenuePredicted = thisMonth
    .filter((p) => p.status !== "fechada" && p.status !== "perdida")
    .reduce((s, p) => s + p.total_price * STATUS_PROBABILITY[p.status], 0);

  // Conversion rate
  const closedCount = thisMonth.filter((p) => p.status === "fechada").length;
  const totalExclNew = thisMonth.filter((p) => p.status !== "nova").length;
  const conversionRate = totalExclNew > 0 ? (closedCount / totalExclNew) * 100 : 0;

  const closedCountLast = lastMonth.filter((p) => p.status === "fechada").length;
  const totalExclNewLast = lastMonth.filter((p) => p.status !== "nova").length;
  const conversionRateLast = totalExclNewLast > 0 ? (closedCountLast / totalExclNewLast) * 100 : 0;

  // Ticket médio
  const ticketMedio = closedCount > 0 ? revenueClosed / closedCount : 0;
  const ticketMedioLast = closedCountLast > 0 ? revenueClosedLast / closedCountLast : 0;

  // Avg closing time (days)
  const closedProposals = proposals.filter((p) => p.status === "fechada");
  const avgClosingDays = closedProposals.length > 0
    ? closedProposals.reduce((s, p) => {
        const days = Math.floor((Date.now() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24));
        return s + days;
      }, 0) / closedProposals.length
    : 0;

  // Loss rate this month
  const lostCount = thisMonth.filter((p) => p.status === "perdida").length;
  const lossRate = thisMonth.length > 0 ? (lostCount / thisMonth.length) * 100 : 0;

  const pctChange = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return ((curr - prev) / prev) * 100;
  };

  const kpis = [
    {
      label: "Receita Fechada",
      value: formatCurrency(revenueClosed),
      change: pctChange(revenueClosed, revenueClosedLast),
      icon: DollarSign,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-600",
    },
    {
      label: "Receita Prevista",
      value: formatCurrency(revenuePredicted),
      subtitle: "propostas em aberto",
      icon: Target,
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-600",
    },
    {
      label: "Taxa de Conversão",
      value: `${conversionRate.toFixed(1)}%`,
      change: pctChange(conversionRate, conversionRateLast),
      icon: BarChart3,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      label: "Ticket Médio",
      value: formatCurrency(ticketMedio),
      change: pctChange(ticketMedio, ticketMedioLast),
      icon: Receipt,
      iconBg: "bg-violet-500/10",
      iconColor: "text-violet-600",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground uppercase tracking-wider leading-tight">
                      {kpi.label}
                    </p>
                    <p className="text-lg sm:text-2xl font-bold mt-1 truncate">{kpi.value}</p>
                    {kpi.change !== undefined && (
                      <div className={`flex items-center gap-1 mt-1 text-[10px] sm:text-xs font-medium ${kpi.change >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                        {kpi.change >= 0 ? <TrendingUp className="w-3 h-3 shrink-0" /> : <TrendingDown className="w-3 h-3 shrink-0" />}
                        <span className="hidden sm:inline">{kpi.change >= 0 ? "+" : ""}{kpi.change.toFixed(1)}% vs mês anterior</span>
                        <span className="sm:hidden">{kpi.change >= 0 ? "+" : ""}{kpi.change.toFixed(1)}%</span>
                      </div>
                    )}
                    {kpi.subtitle && (
                      <p className="text-[11px] text-muted-foreground mt-1">{kpi.subtitle}</p>
                    )}
                  </div>
                  <div className={`h-9 w-9 rounded-lg ${kpi.iconBg} flex items-center justify-center shrink-0`}>
                    <Icon className={`h-4 w-4 ${kpi.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Propostas do Mês</p>
            <p className="text-xl font-bold mt-0.5">{thisMonth.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Tempo Médio (dias)</p>
            <p className="text-xl font-bold mt-0.5">{avgClosingDays.toFixed(0)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Taxa de Perda</p>
            <p className="text-xl font-bold mt-0.5 text-red-500">{lossRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardKPIs;
