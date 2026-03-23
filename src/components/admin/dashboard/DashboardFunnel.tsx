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
    nova: 0,
    enviada: 0,
    em_negociacao: 0,
    fechada: 0,
    perdida: 0,
  };

  const revenue: Record<ProposalStatus, number> = {
    nova: 0,
    enviada: 0,
    em_negociacao: 0,
    fechada: 0,
    perdida: 0,
  };

  proposals.forEach((p) => {
    counts[p.status]++;
    revenue[p.status] += p.total_price;
  });

  const total = proposals.length || 1;

  // Conversion rates between sequential stages (excluding perdida)
  const conversionStages = FUNNEL_STAGES.filter((s) => s.status !== "perdida");

  return (
    <Card className="border-border/50">
      <CardContent className="p-4 sm:p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          Funil de Vendas
        </h3>

        <div className="space-y-2">
          {FUNNEL_STAGES.map((stage, i) => {
            const count = counts[stage.status];
            const pct = (count / total) * 100;
            const config = STATUS_CONFIG[stage.status];
            const rev = revenue[stage.status];

            // Conversion from previous stage
            let conversion: string | null = null;
            if (i > 0 && i < 4) {
              const prevStatus = FUNNEL_STAGES[i - 1].status;
              const prevCount = counts[prevStatus];
              if (prevCount > 0) {
                conversion = `${((count / prevCount) * 100).toFixed(0)}%`;
              }
            }

            // Width: min 20%, max 100%, proportional to total
            const barWidth = Math.max(20, pct);

            return (
              <div key={stage.status} className="group">
                {conversion && (
                  <div className="flex items-center gap-2 ml-4 mb-0.5">
                    <div className="w-px h-3 bg-border" />
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {conversion} conversão
                    </span>
                  </div>
                )}
                <div
                  className="relative rounded-lg px-3 py-2.5 transition-all cursor-default"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: config.color + "15",
                    borderLeft: `3px solid ${config.color}`,
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-semibold" style={{ color: config.color }}>
                        {count}
                      </span>
                      <span className="text-xs text-foreground font-medium truncate">
                        {stage.label}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-medium whitespace-nowrap">
                      {formatCurrency(rev)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>{proposals.length} propostas no total</span>
          <span className="font-semibold text-emerald-600">
            {total > 0 ? ((counts.fechada / total) * 100).toFixed(1) : "0"}% taxa geral
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardFunnel;
