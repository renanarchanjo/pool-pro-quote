interface FunnelStage {
  label: string;
  count: number;
  revenue: number;
  color: string;
}

interface Props {
  stages: FunnelStage[];
  total: number;
}

const formatCurrency = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

const MemberSalesFunnel = ({ stages, total }: Props) => {
  const maxCount = Math.max(...stages.map(s => s.count), 1);

  return (
    <div className="mt-3 pt-3 border-t border-border">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-3">
        Funil de Vendas
      </p>
      <div className="space-y-2">
        {stages.map((stage) => {
          const fillPct = (stage.count / maxCount) * 100;
          return (
            <div key={stage.label} className="flex flex-col gap-1">
              <div className="flex items-center gap-2.5">
                <span className="text-[14px] font-bold text-foreground min-w-[18px] text-right tabular-nums">
                  {stage.count}
                </span>
                <span className="text-[13px] font-medium text-foreground min-w-[100px]">
                  {stage.label}
                </span>
                <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                  {stage.count > 0 && (
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.max(fillPct, 4)}%`,
                        backgroundColor: stage.color,
                      }}
                    />
                  )}
                </div>
              </div>
              <span className="text-[12px] text-muted-foreground pl-[30px] tabular-nums">
                {formatCurrency(stage.revenue)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 pt-2 border-t border-border flex items-center justify-between">
        <span className="text-[12px] text-muted-foreground">{total} propostas no total</span>
      </div>
    </div>
  );
};

export default MemberSalesFunnel;
