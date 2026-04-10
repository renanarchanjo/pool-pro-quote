import { Proposal, formatCurrency } from "./types";

interface Props {
  proposals: Proposal[];
  role?: string;
  commissionPercent?: number;
}

const DashboardKPIs = ({ proposals, role, commissionPercent = 0 }: Props) => {
  const closed = proposals.filter((p) => p.status === "fechada");
  const isOwner = role === "owner";

  const faturamentoBruto = closed.reduce((s, p) => s + p.total_price, 0);

  const faturamentoLiquido = closed.reduce((s, p) => {
    const modelCost = p.pool_models?.cost || 0;
    const includedItemsCost = (p.pool_models as any)?._included_items_cost || 0;
    const optionalsCost = Array.isArray(p.selected_optionals)
      ? p.selected_optionals.reduce((sum: number, o: any) => sum + (o?.cost || 0), 0)
      : 0;
    const totalCost = modelCost + includedItemsCost + optionalsCost;
    return s + (p.total_price - totalCost);
  }, 0);
  const comissaoTotal = faturamentoBruto * (commissionPercent / 100);

  const totalWorked = proposals.filter((p) => p.status !== "nova").length;
  const conversionRate = totalWorked > 0 ? (closed.length / totalWorked) * 100 : 0;

  const ticketMedio = closed.length > 0 ? faturamentoBruto / closed.length : 0;

  const marginPct = faturamentoBruto > 0 ? (faturamentoLiquido / faturamentoBruto) * 100 : 0;

  const secondKpi = isOwner
    ? {
        label: "FATURAMENTO LÍQUIDO",
        value: formatCurrency(faturamentoLiquido),
        subtitle: faturamentoBruto > 0 ? `margem ${marginPct.toFixed(1)}%` : undefined,
      }
    : {
        label: "COMISSÃO",
        value: formatCurrency(comissaoTotal),
        subtitle: `${commissionPercent}% sobre vendas`,
      };

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

export default DashboardKPIs;
