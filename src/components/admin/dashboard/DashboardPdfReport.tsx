import { endOfMonth, startOfMonth, subMonths } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Proposal, PRIORITY_CONFIG, STATUS_CONFIG, STATUS_PROBABILITY, daysSince, formatCurrency, getPriority } from "./types";

interface Props {
  proposals: Proposal[];
  profileName?: string | null;
  storeName?: string | null;
  dateLabel?: string;
}

const DashboardPdfReport = ({ proposals, profileName, storeName, dateLabel }: Props) => {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  const thisMonth = proposals.filter((p) => new Date(p.created_at) >= monthStart);
  const lastMonth = proposals.filter(
    (p) => new Date(p.created_at) >= lastMonthStart && new Date(p.created_at) <= lastMonthEnd,
  );

  const revenueClosed = thisMonth.filter((p) => p.status === "fechada").reduce((s, p) => s + p.total_price, 0);
  const revenueClosedLast = lastMonth.filter((p) => p.status === "fechada").reduce((s, p) => s + p.total_price, 0);
  const revenuePredicted = thisMonth
    .filter((p) => p.status !== "fechada" && p.status !== "perdida")
    .reduce((s, p) => s + p.total_price * STATUS_PROBABILITY[p.status], 0);

  const closedCount = thisMonth.filter((p) => p.status === "fechada").length;
  const totalExclNew = thisMonth.filter((p) => p.status !== "nova").length;
  const conversionRate = totalExclNew > 0 ? (closedCount / totalExclNew) * 100 : 0;
  const ticketMedio = closedCount > 0 ? revenueClosed / closedCount : 0;
  const lostCount = thisMonth.filter((p) => p.status === "perdida").length;
  const lossRate = thisMonth.length > 0 ? (lostCount / thisMonth.length) * 100 : 0;

  const pctChange = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return ((curr - prev) / prev) * 100;
  };

  const funnelStatuses: Array<Proposal["status"]> = ["nova", "enviada", "em_negociacao", "fechada", "perdida"];
  const funnel = funnelStatuses.map((status) => ({
    status,
    count: proposals.filter((p) => p.status === status).length,
    revenue: proposals.filter((p) => p.status === status).reduce((sum, p) => sum + p.total_price, 0),
  }));

  const activeProposals = proposals.filter((p) => p.status !== "fechada" && p.status !== "perdida");
  const stale = [...activeProposals].filter((p) => daysSince(p.created_at) > 3).sort((a, b) => daysSince(b.created_at) - daysSince(a.created_at)).slice(0, 6);
  const inNegotiation = [...activeProposals].filter((p) => p.status === "em_negociacao").sort((a, b) => daysSince(b.created_at) - daysSince(a.created_at)).slice(0, 6);
  const pipelineRows = [...proposals]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 14);

  const reportDate = new Date().toLocaleDateString("pt-BR");
  const reportTime = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="w-[1100px] bg-background text-foreground p-8 space-y-6">
      <header className="border-b border-border pb-4" data-pdf-section>
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-sm text-muted-foreground">
              Relatório gerado para <span className="font-semibold text-foreground">{profileName || "Lojista"}</span>
            </p>
            <h1 className="text-3xl font-bold tracking-tight mt-1">Painel Comercial</h1>
            <p className="text-sm text-muted-foreground mt-2">
              {storeName ? `${storeName} · ` : ""}{dateLabel ? `Período: ${dateLabel} · ` : ""}Gerado em {reportDate} às {reportTime}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Base</p>
            <p className="text-2xl font-bold">{proposals.length}</p>
            <p className="text-sm text-muted-foreground">propostas totais</p>
          </div>
        </div>
      </header>

      <section className="space-y-3" style={{ pageBreakInside: "avoid" }} data-pdf-section>
        <div>
          <h2 className="text-lg font-semibold">Indicadores do mês</h2>
          <p className="text-sm text-muted-foreground">Resumo comercial do período atual</p>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Receita Fechada", value: formatCurrency(revenueClosed), change: pctChange(revenueClosed, revenueClosedLast) },
            { label: "Receita Prevista", value: formatCurrency(revenuePredicted), helper: "propostas em aberto" },
            { label: "Taxa de Conversão", value: `${conversionRate.toFixed(1)}%`, change: pctChange(conversionRate, 0) },
            { label: "Ticket Médio", value: formatCurrency(ticketMedio) },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-border bg-card px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
              <p className="text-3xl font-bold mt-3 leading-none">{item.value}</p>
              {item.change !== undefined ? (
                <p className="text-sm text-muted-foreground mt-3">Variação: {item.change >= 0 ? "+" : ""}{item.change.toFixed(1)}%</p>
              ) : item.helper ? (
                <p className="text-sm text-muted-foreground mt-3">{item.helper}</p>
              ) : null}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-card px-4 py-4 text-center">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Propostas / mês</p>
            <p className="text-2xl font-bold mt-2">{thisMonth.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-4 text-center">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Fechamentos</p>
            <p className="text-2xl font-bold mt-2">{closedCount}</p>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-4 text-center">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Taxa de perda</p>
            <p className="text-2xl font-bold mt-2">{lossRate.toFixed(1)}%</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4" style={{ pageBreakInside: "avoid" }} data-pdf-section>
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Funil de vendas</h2>
          <div className="mt-4 space-y-3">
            {funnel.map((stage) => {
              const maxCount = Math.max(...funnel.map((item) => item.count), 1);
              const width = `${(stage.count / maxCount) * 100}%`;
              return (
                <div key={stage.status} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="outline" className={STATUS_CONFIG[stage.status].className}>{STATUS_CONFIG[stage.status].label}</Badge>
                      <span className="text-sm text-muted-foreground">{stage.count} propostas</span>
                    </div>
                    <span className="text-sm font-semibold">{formatCurrency(stage.revenue)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Alertas e oportunidades</h2>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Sem atualização</p>
              <div className="mt-2 space-y-2">
                {stale.length > 0 ? stale.map((p) => (
                  <div key={p.id} className="rounded-lg border border-border p-3">
                    <p className="font-medium text-sm">{p.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{p.customer_city} · {daysSince(p.created_at)} dias</p>
                  </div>
                )) : <p className="text-sm text-muted-foreground">Nenhum alerta no momento</p>}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium">Em negociação</p>
              <div className="mt-2 space-y-2">
                {inNegotiation.length > 0 ? inNegotiation.map((p) => (
                  <div key={p.id} className="rounded-lg border border-border p-3">
                    <p className="font-medium text-sm">{p.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(p.total_price)} · {daysSince(p.created_at)} dias</p>
                  </div>
                )) : <p className="text-sm text-muted-foreground">Nenhuma negociação pendente</p>}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5" data-pdf-section>
        <div className="flex items-end justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold">Pipeline resumido</h2>
            <p className="text-sm text-muted-foreground">Últimas propostas para acompanhamento</p>
          </div>
          <p className="text-sm text-muted-foreground">Mostrando {pipelineRows.length} itens</p>
        </div>

        <table className="w-full text-sm border-separate border-spacing-0">
          <thead>
            <tr>
              {[
                "Cliente",
                "Cidade",
                "Modelo",
                "Status",
                "Prioridade",
                "Valor",
                "Tempo",
              ].map((head) => (
                <th key={head} className="text-left px-3 py-3 border-b border-border text-muted-foreground font-medium">
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pipelineRows.map((proposal) => {
              const priority = getPriority(proposal);
              return (
                <tr key={proposal.id}>
                  <td className="px-3 py-3 border-b border-border align-top font-medium">{proposal.customer_name}</td>
                  <td className="px-3 py-3 border-b border-border align-top">{proposal.customer_city}</td>
                  <td className="px-3 py-3 border-b border-border align-top">{proposal.pool_models?.name || "—"}</td>
                  <td className="px-3 py-3 border-b border-border align-top">
                    <Badge variant="outline" className={STATUS_CONFIG[proposal.status].className}>{STATUS_CONFIG[proposal.status].label}</Badge>
                  </td>
                  <td className="px-3 py-3 border-b border-border align-top">
                    <span className={PRIORITY_CONFIG[priority].className}>{PRIORITY_CONFIG[priority].label}</span>
                  </td>
                  <td className="px-3 py-3 border-b border-border align-top font-semibold">{formatCurrency(proposal.total_price)}</td>
                  <td className="px-3 py-3 border-b border-border align-top">{daysSince(proposal.created_at)}d</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default DashboardPdfReport;
