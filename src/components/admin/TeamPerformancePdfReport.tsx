import { Trophy, Clock, Target, DollarSign, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface PerformancePdfMetric {
  memberId: string;
  name: string;
  leadsAccepted: number;
  inNegotiation: number;
  closed: number;
  lost: number;
  revenueClosed: number;
  revenuePredicted: number;
  ticketMedio: number;
  conversionRate: number;
  avgResponseTimeHours: number;
}

interface Props {
  dateLabel: string;
  totals: {
    leads: number;
    closed: number;
    revenue: number;
    predicted: number;
    conversionRate: number;
  };
  metrics: PerformancePdfMetric[];
}

const formatCurrency = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

const TeamPerformancePdfReport = ({ dateLabel, totals, metrics }: Props) => {
  return (
    <div className="w-[1100px] bg-background text-foreground p-8 space-y-6">
      <header className="border-b border-border pb-4" data-pdf-section>
        <h1 className="text-3xl font-bold tracking-tight">Performance da Equipe</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Período: {dateLabel} · Gerado em {new Date().toLocaleDateString("pt-BR")}
        </p>
      </header>

      <section className="grid grid-cols-5 gap-3" style={{ pageBreakInside: "avoid" }} data-pdf-section>
        {[
          { label: "Leads aceitos", value: `${totals.leads}` },
          { label: "Fechamentos", value: `${totals.closed}` },
          { label: "Conversão", value: `${totals.conversionRate.toFixed(1)}%` },
          { label: "Receita fechada", value: formatCurrency(totals.revenue) },
          { label: "Receita prevista", value: formatCurrency(totals.predicted) },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
            <p className="text-2xl font-bold mt-3">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        {metrics.map((m, idx) => {
          const maxRevenue = metrics[0]?.revenueClosed || 1;
          const revenuePercent = (m.revenueClosed / maxRevenue) * 100;

          return (
            <Card key={m.memberId} className="border-border/50 break-inside-avoid" data-pdf-section>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                      idx === 0 ? "bg-amber-100 text-amber-700" :
                      idx === 1 ? "bg-gray-100 text-gray-600" :
                      idx === 2 ? "bg-orange-100 text-orange-700" :
                      "bg-muted text-muted-foreground",
                    )}>
                      {idx < 3 ? <Trophy className="w-5 h-5" /> : <span className="font-bold">{idx + 1}</span>}
                    </div>
                    <div>
                      <p className="text-2xl font-semibold leading-none">{m.name}</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        {m.leadsAccepted} leads aceitos · {m.closed} fechados · {m.lost} perdidos
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-3xl font-bold text-emerald-600 leading-none">{formatCurrency(m.revenueClosed)}</p>
                    <p className="text-sm text-muted-foreground mt-1">receita fechada</p>
                  </div>
                </div>

                <div className="h-4 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${revenuePercent}%` }} />
                </div>

                <div className="grid grid-cols-4 gap-4 pt-1">
                  <div className="flex items-start gap-2">
                    <Target className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Conversão</p>
                      <p className="text-2xl font-semibold leading-none mt-2">{m.conversionRate.toFixed(1)}%</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Ticket Médio</p>
                      <p className="text-2xl font-semibold leading-none mt-2">{formatCurrency(m.ticketMedio)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Tempo Resposta</p>
                      <p className="text-2xl font-semibold leading-none mt-2">
                        {m.avgResponseTimeHours < 1
                          ? `${Math.round(m.avgResponseTimeHours * 60)}min`
                          : `${m.avgResponseTimeHours.toFixed(1)}h`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <TrendingUp className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Receita Prevista</p>
                      <p className="text-2xl font-semibold leading-none mt-2">{formatCurrency(m.revenuePredicted)}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/50 flex items-center gap-3 text-sm flex-wrap">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1">{m.leadsAccepted} aceitos</Badge>
                  <span className="text-muted-foreground">→</span>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 px-3 py-1">{m.inNegotiation} negociando</Badge>
                  <span className="text-muted-foreground">→</span>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 px-3 py-1">{m.closed} fechados</Badge>
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 px-3 py-1">{m.lost} perdidos</Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </div>
  );
};

export default TeamPerformancePdfReport;
