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
    <div className="bg-card border border-border rounded-xl p-5 h-full">
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
            <div key={stage.status} className="flex items-center gap-3 h-10">
              {/* Count */}
              <span className="text-xl font-bold text-foreground min-w-[28px] text-right tabular-nums">
                {count}
              </span>

              {/* Label */}
              <span className="text-sm font-medium text-foreground min-w-[120px]">
                {stage.label}
              </span>

              {/* Progress bar */}
              <div className="flex-1 h-1 bg-accent rounded-full overflow-hidden">
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

              {/* Revenue */}
              <span className="text-[13px] font-medium text-muted-foreground min-w-[100px] text-right tabular-nums">
                {formatCurrency(rev)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[12px] text-muted-foreground">
        <span>{proposals.length} propostas no total</span>
        <span className="font-semibold" style={{ color: "#16A34A" }}>
          {((counts.fechada / total) * 100).toFixed(1)}% taxa geral
        </span>
      </div>
    </div>
  );
};

export default DashboardFunnel;
