import { Card, CardContent } from "@/components/ui/card";
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
    <Card className="border-border/50 h-full">
      <CardContent className="p-3 sm:p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Funil de Vendas
        </h3>

        <div className="space-y-1.5">
          {FUNNEL_STAGES.map((stage, i) => {
            const count = counts[stage.status];
            const config = STATUS_CONFIG[stage.status];
            const rev = revenue[stage.status];
            const fillPct = (count / maxCount) * 100;

            let conversion: string | null = null;
            if (i > 0 && i < 4) {
              const prevCount = counts[FUNNEL_STAGES[i - 1].status];
              if (prevCount > 0) {
                conversion = `${((count / prevCount) * 100).toFixed(0)}%`;
              }
            }

            return (
              <div key={stage.status}>
                {conversion && (
                  <div className="flex items-center gap-1.5 ml-3 mb-0.5">
                    <div className="w-px h-2.5 bg-border" />
                    <span className="text-[9px] text-muted-foreground font-medium">
                      {conversion} conversão
                    </span>
                  </div>
                )}
                <div
                  className="relative rounded-md px-2.5 py-1.5 overflow-hidden"
                  style={{
                    backgroundColor: config.color + "08",
                    borderLeft: `3px solid ${config.color}`,
                  }}
                >
                  {count > 0 && (
                    <div
                      className="absolute inset-y-0 left-0 rounded-md transition-all"
                      style={{
                        width: `${Math.max(fillPct, 5)}%`,
                        backgroundColor: config.color + "15",
                      }}
                    />
                  )}
                  <div className="relative flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-semibold" style={{ color: config.color }}>
                        {count}
                      </span>
                      <span className="text-[11px] text-foreground font-medium">
                        {stage.label}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap">
                      {formatCurrency(rev)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 pt-2 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{proposals.length} propostas no total</span>
          <span className="font-semibold text-emerald-600">
            {((counts.fechada / total) * 100).toFixed(1)}% taxa geral
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardFunnel;
