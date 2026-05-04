import { memo } from "react";
import { Proposal, ProposalStatus, STATUS_CONFIG, formatCurrency } from "./types";
import { TrendingDown } from "lucide-react";

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
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Funil de Vendas
        </p>
        <span className="text-[11px] font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded">
          {((counts.fechada / total) * 100).toFixed(1)}% conversão
        </span>
      </div>

      <div className="space-y-3">
        {FUNNEL_STAGES.map((stage, idx) => {
          const count = counts[stage.status];
          const config = STATUS_CONFIG[stage.status];
          const rev = revenue[stage.status];
          const fillPct = (count / maxCount) * 100;

          // drop vs previous *active* stage
          let dropPct: number | null = null;
          if (idx > 0 && stage.status !== "perdida") {
            const prev = FUNNEL_STAGES[idx - 1];
            if (prev.status !== "perdida") {
              const prevCount = counts[prev.status];
              if (prevCount > 0) {
                dropPct = ((prevCount - count) / prevCount) * 100;
              }
            }
          }

          return (
            <div key={stage.status}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: config.color }}
                  />
                  <span className="text-[13px] font-medium text-foreground truncate">
                    {stage.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-right shrink-0">
                  <span className="text-[13px] font-bold text-foreground tabular-nums">
                    {count}
                  </span>
                  <span className="text-[11px] text-muted-foreground tabular-nums hidden sm:inline">
                    {formatCurrency(rev)}
                  </span>
                </div>
              </div>
              <div className="relative h-2.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${Math.max(fillPct, count > 0 ? 4 : 0)}%`,
                    backgroundColor: config.color,
                  }}
                />
              </div>
              <div className="flex items-center justify-between mt-1 sm:hidden">
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {formatCurrency(rev)}
                </span>
              </div>
              {dropPct !== null && dropPct > 0 && (
                <div className="flex items-center gap-1 mt-1 ml-4">
                  <TrendingDown className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">
                    ↓ {dropPct.toFixed(0)}% vs etapa anterior
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-border">
        <span className="text-[12px] text-muted-foreground">
          {proposals.length} proposta{proposals.length !== 1 ? "s" : ""} no total
        </span>
      </div>
    </div>
  );
};

export default memo(DashboardFunnel);
