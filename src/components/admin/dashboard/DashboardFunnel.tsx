import { Proposal, ProposalStatus, STATUS_CONFIG, formatCurrency } from "./types";

interface Props {
  proposals: Proposal[];
}

const FUNNEL_STAGES: { status: ProposalStatus; label: string }[] = [
  { status: "nova", label: "Novas" },
  { status: "enviada", label: "Enviadas" },
  { status: "em_negociacao", label: "Em Negociação" },
  { status: "fechada", label: "Fechadas" },
  { status: "perdida", label: "Perdidas" },
];

const DashboardFunnel = ({ proposals }: Props) => {
  const counts: Record<ProposalStatus, number> = {
    nova: 0, enviada: 0, em_negociacao: 0, fechada: 0, perdida: 0,
  };
  const revenue: Record<ProposalStatus, number> = {
    nova: 0, enviada: 0, em_negociacao: 0, fechada: 0, perdida: 0,
  };

  proposals.forEach((p) => {
    counts[p.status]++;
    revenue[p.status] += p.total_price;
  });

  const total = proposals.length || 1;
  const maxCount = Math.max(...Object.values(counts), 1);

  return (
    <div className="bg-card border border-border rounded-xl p-4 md:p-5 h-full">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-4">
        Funil de Vendas
      </p>

      <div className="space-y-2">
        {FUNNEL_STAGES.map((stage) => {
          const count = counts[stage.status];
          const config = STATUS_CONFIG[stage.status];
          const rev = revenue[stage.status];
          const fillPct = (count / maxCount) * 100;

          return (
            <div key={stage.status}>
              {/* Desktop: single row */}
              <div className="hidden md:flex items-center gap-3 h-10">
                <span className="text-[16px] font-bold text-foreground min-w-[20px] text-right tabular-nums">
                  {count}
                </span>
                <span className="text-[14px] font-medium text-foreground min-w-[130px]">
                  {stage.label}
                </span>
                <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                  {count > 0 && (
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.max(fillPct, 4)}%`,
                        backgroundColor: config.color,
                      }}
                    />
                  )}
                </div>
                <span className="text-[13px] font-medium text-muted-foreground min-w-[100px] text-right tabular-nums">
                  {formatCurrency(rev)}
                </span>
              </div>

              {/* Mobile: compact layout — number + name + bar, value below */}
              <div className="flex md:hidden flex-col gap-1">
                <div className="flex items-center gap-2.5">
                  <span className="text-[14px] font-bold text-foreground min-w-[18px] text-right tabular-nums">
                    {count}
                  </span>
                  <span className="text-[13px] font-medium text-foreground min-w-[100px]">
                    {stage.label}
                  </span>
                  <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                    {count > 0 && (
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.max(fillPct, 4)}%`,
                          backgroundColor: config.color,
                        }}
                      />
                    )}
                  </div>
                </div>
                <span className="text-[12px] text-muted-foreground pl-[30px] tabular-nums">
                  {formatCurrency(rev)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
        <span className="text-[12px] md:text-[13px] text-muted-foreground">{proposals.length} propostas no total</span>
        <span className="text-[11px] font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded">
          {((counts.fechada / total) * 100).toFixed(1)}% taxa geral
        </span>
      </div>
    </div>
  );
};

export default DashboardFunnel;
