import { memo } from "react";
import { Proposal, formatCurrency } from "./types";
import { TrendingUp, DollarSign, Target, BarChart2, ArrowUp, ArrowDown, Minus, type LucideIcon } from "lucide-react";

interface Props {
  proposals: Proposal[];
  role?: string;
  commissionPercent?: number;
  allCommissions?: { member_id: string; commission_percent: number }[];
  leadDistributions?: { proposal_id: string; accepted_by: string | null; status: string }[];
}

const computeVariation = (current: number, previous: number): number | null => {
  if (previous <= 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
};

const DashboardKPIs = ({
  proposals,
  role,
  commissionPercent = 0,
  allCommissions = [],
  leadDistributions = [],
}: Props) => {
  const closed = proposals.filter((p) => p.status === "fechada");
  const isOwner = role === "owner";

  const faturamentoBruto = closed.reduce((s, p) => s + p.total_price, 0);
  const totalWorked = proposals.filter((p) => p.status !== "nova").length;
  const conversionRate = totalWorked > 0 ? (closed.length / totalWorked) * 100 : 0;
  const ticketMedio = closed.length > 0 ? faturamentoBruto / closed.length : 0;

  // Period split: current vs previous (split filtered set in half by date)
  const sorted = [...proposals].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const mid = Math.floor(sorted.length / 2);
  const previousSet = sorted.slice(0, mid);
  const currentSet = sorted.slice(mid);
  const closedPrev = previousSet.filter((p) => p.status === "fechada");
  const closedCurr = currentSet.filter((p) => p.status === "fechada");
  const fatPrev = closedPrev.reduce((s, p) => s + p.total_price, 0);
  const fatCurr = closedCurr.reduce((s, p) => s + p.total_price, 0);
  const ticketPrev = closedPrev.length > 0 ? fatPrev / closedPrev.length : 0;
  const ticketCurr = closedCurr.length > 0 ? fatCurr / closedCurr.length : 0;
  const workedPrev = previousSet.filter((p) => p.status !== "nova").length;
  const workedCurr = currentSet.filter((p) => p.status !== "nova").length;
  const convPrev = workedPrev > 0 ? (closedPrev.length / workedPrev) * 100 : 0;
  const convCurr = workedCurr > 0 ? (closedCurr.length / workedCurr) * 100 : 0;

  let secondKpi: { label: string; value: string; subtitle?: string; icon: LucideIcon; variation: number | null };

  if (isOwner) {
    const calcCustos = (list: Proposal[]) =>
      list.reduce((s, p) => {
        const modelCost = p.pool_models?.cost || 0;
        const includedItemsCost = (p.pool_models as any)?._included_items_cost || 0;
        const optionalsCost = Array.isArray(p.selected_optionals)
          ? p.selected_optionals.reduce((sum: number, o: any) => sum + (o?.cost || 0), 0)
          : 0;
        return s + modelCost + includedItemsCost + optionalsCost;
      }, 0);
    const calcComm = (list: Proposal[]) =>
      list.reduce((s, p) => {
        const dist = leadDistributions.find((d) => d.proposal_id === p.id && d.status === "accepted");
        const memberId = dist?.accepted_by || (p as any).created_by;
        if (!memberId) return s;
        const cs = allCommissions.find((c) => c.member_id === memberId);
        if (!cs) return s;
        return s + p.total_price * (cs.commission_percent / 100);
      }, 0);

    const lucroLiquido = faturamentoBruto - calcCustos(closed) - calcComm(closed);
    const lucroPrev = fatPrev - calcCustos(closedPrev) - calcComm(closedPrev);
    const lucroCurr = fatCurr - calcCustos(closedCurr) - calcComm(closedCurr);
    const marginPct = faturamentoBruto > 0 ? (lucroLiquido / faturamentoBruto) * 100 : 0;

    secondKpi = {
      label: "LUCRO LÍQUIDO",
      value: formatCurrency(lucroLiquido),
      subtitle: faturamentoBruto > 0 ? `Margem: ${marginPct.toFixed(1)}%` : "Margem: —",
      icon: DollarSign,
      variation: computeVariation(lucroCurr, lucroPrev),
    };
  } else {
    const comissaoTotal = faturamentoBruto * (commissionPercent / 100);
    const comissaoCurr = fatCurr * (commissionPercent / 100);
    const comissaoPrev = fatPrev * (commissionPercent / 100);
    secondKpi = {
      label: "COMISSÃO",
      value: formatCurrency(comissaoTotal),
      subtitle: `${commissionPercent}% sobre vendas`,
      icon: DollarSign,
      variation: computeVariation(comissaoCurr, comissaoPrev),
    };
  }

  const kpis = [
    {
      label: "FATURAMENTO BRUTO",
      value: formatCurrency(faturamentoBruto),
      subtitle: closed.length > 0 ? `${closed.length} venda${closed.length > 1 ? "s" : ""} fechada${closed.length > 1 ? "s" : ""}` : "Sem vendas no período",
      icon: TrendingUp,
      variation: computeVariation(fatCurr, fatPrev),
    },
    secondKpi,
    {
      label: "TAXA DE CONVERSÃO",
      value: `${conversionRate.toFixed(1)}%`,
      subtitle: "Meta: 30%",
      icon: Target,
      variation: computeVariation(convCurr, convPrev),
    },
    {
      label: "TICKET MÉDIO",
      value: formatCurrency(ticketMedio),
      subtitle: `${closed.length} proposta${closed.length !== 1 ? "s" : ""} fechada${closed.length !== 1 ? "s" : ""}`,
      icon: BarChart2,
      variation: computeVariation(ticketCurr, ticketPrev),
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        const v = kpi.variation;
        const trend =
          v === null ? "neutral" : v > 0.05 ? "up" : v < -0.05 ? "down" : "neutral";
        const TrendIcon = trend === "up" ? ArrowUp : trend === "down" ? ArrowDown : Minus;
        const trendClass =
          trend === "up"
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : trend === "down"
            ? "bg-red-500/10 text-red-600 dark:text-red-400"
            : "bg-muted text-muted-foreground";
        const trendText =
          v === null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
        return (
          <div
            key={kpi.label}
            className="bg-card border border-border rounded-xl py-4 px-4 md:py-5 md:px-5 transition-all duration-150 hover:border-primary/40 hover:shadow-sm"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="w-4 h-4 text-primary" strokeWidth={2} />
              </div>
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${trendClass}`}>
                <TrendIcon className="w-2.5 h-2.5" strokeWidth={3} />
                {trendText}
              </span>
            </div>
            <p className="text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-1">
              {kpi.label}
            </p>
            <p className="text-[20px] md:text-[26px] font-bold text-foreground leading-tight tabular-nums">{kpi.value}</p>
            {kpi.subtitle && (
              <p className="text-[11px] text-muted-foreground mt-1">{kpi.subtitle}</p>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default memo(DashboardKPIs);
