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
    <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl p-5 h-full">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF] mb-4">
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
              <span className="text-[16px] font-bold text-[#0D0D0D] min-w-[20px] text-right tabular-nums">
                {count}
              </span>

              <span className="text-[14px] font-medium text-[#0D0D0D] min-w-[130px]">
                {stage.label}
              </span>

              <div className="flex-1 h-1 bg-[#F3F4F6] rounded-full overflow-hidden">
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

              <span className="text-[13px] font-medium text-[#6B7280] min-w-[100px] text-right tabular-nums">
                {formatCurrency(rev)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-[#E5E7EB] flex items-center justify-between">
        <span className="text-[13px] text-[#9CA3AF]">{proposals.length} propostas no total</span>
        <span className="text-[11px] font-semibold bg-[#F3F4F6] text-[#6B7280] px-2 py-0.5 rounded">
          {((counts.fechada / total) * 100).toFixed(1)}% taxa geral
        </span>
      </div>
    </div>
  );
};

export default DashboardFunnel;
