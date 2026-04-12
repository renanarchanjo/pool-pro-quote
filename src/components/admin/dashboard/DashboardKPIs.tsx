import { memo } from "react";
import { Proposal, formatCurrency } from "./types";

interface Props {
  proposals: Proposal[];
  role?: string;
  commissionPercent?: number;
  allCommissions?: { member_id: string; commission_percent: number }[];
  leadDistributions?: { proposal_id: string; accepted_by: string | null; status: string }[];
}

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

  // Owner-only: custos e lucro líquido
  let secondKpi: { label: string; value: string; subtitle?: string };

  if (isOwner) {
    const custosTotais = closed.reduce((s, p) => {
      const modelCost = p.pool_models?.cost || 0;
      const includedItemsCost = (p.pool_models as any)?._included_items_cost || 0;
      const optionalsCost = Array.isArray(p.selected_optionals)
        ? p.selected_optionals.reduce((sum: number, o: any) => sum + (o?.cost || 0), 0)
        : 0;
      return s + modelCost + includedItemsCost + optionalsCost;
    }, 0);

    const comissoesPagar = closed.reduce((s, p) => {
      const dist = leadDistributions.find(
        (d) => d.proposal_id === p.id && d.status === "accepted"
      );
      const memberId = dist?.accepted_by || (p as any).created_by;
      if (!memberId) return s;
      const commSetting = allCommissions.find((c) => c.member_id === memberId);
      if (!commSetting) return s;
      return s + p.total_price * (commSetting.commission_percent / 100);
    }, 0);

    const lucroLiquido = faturamentoBruto - custosTotais - comissoesPagar;
    const marginPct = faturamentoBruto > 0 ? (lucroLiquido / faturamentoBruto) * 100 : 0;

    secondKpi = {
      label: "LUCRO LÍQUIDO",
      value: formatCurrency(lucroLiquido),
      subtitle: faturamentoBruto > 0 ? `margem ${marginPct.toFixed(1)}%` : undefined,
    };
  } else {
    const comissaoTotal = faturamentoBruto * (commissionPercent / 100);
    secondKpi = {
      label: "COMISSÃO",
      value: formatCurrency(comissaoTotal),
      subtitle: `${commissionPercent}% sobre vendas`,
    };
  }

  const kpis = [
    {
      label: "FATURAMENTO BRUTO",
      value: formatCurrency(faturamentoBruto),
      subtitle: closed.length > 0 ? `${closed.length} venda${closed.length > 1 ? "s" : ""} fechada${closed.length > 1 ? "s" : ""}` : undefined,
    },
    secondKpi,
    {
      label: "TAXA DE CONVERSÃO FV",
      value: `${conversionRate.toFixed(1)}%`,
      subtitle: totalWorked > 0 ? `${closed.length}/${totalWorked} trabalhadas` : undefined,
    },
    {
      label: "TICKET MÉDIO",
      value: formatCurrency(ticketMedio),
      subtitle: closed.length > 0 ? `base: ${closed.length} venda${closed.length > 1 ? "s" : ""}` : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className="bg-card border border-border rounded-xl py-4 px-4 md:py-5 md:px-6"
        >
          <p className="text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-1.5 md:mb-2">
            {kpi.label}
          </p>
          <p className="text-[22px] md:text-[28px] font-bold text-foreground leading-tight">{kpi.value}</p>
          {kpi.subtitle && (
            <p className="text-[12px] text-muted-foreground mt-1">{kpi.subtitle}</p>
          )}
        </div>
      ))}
    </div>
  );
};

export default memo(DashboardKPIs);
