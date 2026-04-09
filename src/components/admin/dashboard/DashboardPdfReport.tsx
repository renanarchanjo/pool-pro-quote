import { endOfMonth, startOfMonth, subMonths } from "date-fns";
import { Proposal, PRIORITY_CONFIG, STATUS_CONFIG, STATUS_PROBABILITY, daysSince, formatCurrency, getPriority } from "./types";

interface Props {
  proposals: Proposal[];
  profileName?: string | null;
  storeName?: string | null;
  dateLabel?: string;
}

const ACCENT = "#0EA5E9";
const ACCENT_LIGHT = "#F0F9FF";
const BORDER = "#E2E8F0";
const TEXT_PRIMARY = "#0F172A";
const TEXT_SECONDARY = "#64748B";
const TEXT_MUTED = "#94A3B8";
const SUCCESS = "#059669";
const DANGER = "#DC2626";

const STATUS_COLORS: Record<string, string> = {
  nova: "#3B82F6",
  enviada: "#8B5CF6",
  em_negociacao: "#F59E0B",
  fechada: "#059669",
  perdida: "#DC2626",
};

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
  const stale = [...activeProposals].filter((p) => daysSince(p.created_at) > 3).sort((a, b) => daysSince(b.created_at) - daysSince(a.created_at)).slice(0, 5);
  const inNegotiation = [...activeProposals].filter((p) => p.status === "em_negociacao").sort((a, b) => daysSince(b.created_at) - daysSince(a.created_at)).slice(0, 5);
  const pipelineRows = [...proposals]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 14);

  const reportDate = new Date().toLocaleDateString("pt-BR");
  const reportTime = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const maxFunnel = Math.max(...funnel.map((f) => f.count), 1);

  return (
    <div style={{ width: 1100, background: "#fff", color: TEXT_PRIMARY, fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif", padding: 0 }}>

      {/* ═══ HEADER ═══ */}
      <div data-pdf-section style={{ padding: "40px 48px 28px", borderBottom: `2px solid ${ACCENT}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ fontSize: 11, color: TEXT_MUTED, letterSpacing: "0.12em", textTransform: "uppercase", margin: 0 }}>Relatório Comercial</p>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: "6px 0 0", letterSpacing: "-0.02em", color: TEXT_PRIMARY }}>Painel Comercial</h1>
            <p style={{ fontSize: 13, color: TEXT_SECONDARY, margin: "8px 0 0" }}>
              {storeName ? `${storeName} · ` : ""}{profileName ? `${profileName} · ` : ""}{dateLabel ? `${dateLabel} · ` : ""}Gerado em {reportDate} às {reportTime}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 36, fontWeight: 700, color: ACCENT, margin: 0, lineHeight: 1 }}>{proposals.length}</p>
            <p style={{ fontSize: 12, color: TEXT_SECONDARY, margin: "4px 0 0" }}>propostas no período</p>
          </div>
        </div>
      </div>

      {/* ═══ RESUMO EXECUTIVO ═══ */}
      <div data-pdf-section style={{ padding: "32px 48px", pageBreakInside: "avoid" }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: TEXT_PRIMARY, margin: "0 0 4px", letterSpacing: "-0.01em" }}>Resumo do Período</h2>
        <p style={{ fontSize: 12, color: TEXT_SECONDARY, margin: "0 0 20px" }}>Indicadores-chave de desempenho comercial</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0, borderTop: `1px solid ${BORDER}`, borderLeft: `1px solid ${BORDER}` }}>
          {[
            { label: "Receita Fechada", value: formatCurrency(revenueClosed), change: pctChange(revenueClosed, revenueClosedLast), positive: revenueClosed >= revenueClosedLast },
            { label: "Receita Prevista", value: formatCurrency(revenuePredicted), sub: "propostas em aberto" },
            { label: "Taxa de Conversão", value: `${conversionRate.toFixed(1)}%`, sub: `${closedCount} de ${totalExclNew} trabalhadas` },
            { label: "Ticket Médio", value: formatCurrency(ticketMedio), sub: `${closedCount} fechamentos` },
          ].map((item) => (
            <div key={item.label} style={{ padding: "20px 24px", borderRight: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>{item.label}</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: TEXT_PRIMARY, margin: "10px 0 0", lineHeight: 1 }}>{item.value}</p>
              {item.change !== undefined ? (
                <p style={{ fontSize: 11, color: item.positive ? SUCCESS : DANGER, margin: "8px 0 0", fontWeight: 500 }}>
                  {item.change >= 0 ? "▲" : "▼"} {Math.abs(item.change).toFixed(1)}% vs mês anterior
                </p>
              ) : item.sub ? (
                <p style={{ fontSize: 11, color: TEXT_MUTED, margin: "8px 0 0" }}>{item.sub}</p>
              ) : null}
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0, borderLeft: `1px solid ${BORDER}` }}>
          {[
            { label: "Propostas no Mês", value: thisMonth.length },
            { label: "Fechamentos", value: closedCount },
            { label: "Taxa de Perda", value: `${lossRate.toFixed(1)}%` },
          ].map((item) => (
            <div key={item.label} style={{ padding: "16px 24px", borderRight: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, textAlign: "center" }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>{item.label}</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: TEXT_PRIMARY, margin: "8px 0 0" }}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ FUNIL + ALERTAS ═══ */}
      <div data-pdf-section style={{ padding: "0 48px 32px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, pageBreakInside: "avoid" }}>
        {/* Funil */}
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: TEXT_PRIMARY, margin: "0 0 4px" }}>Funil de Vendas</h2>
          <p style={{ fontSize: 12, color: TEXT_SECONDARY, margin: "0 0 20px" }}>Distribuição por etapa</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {funnel.map((stage) => {
              const width = `${Math.max((stage.count / maxFunnel) * 100, 4)}%`;
              return (
                <div key={stage.status}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{
                        display: "inline-block", width: 8, height: 8, borderRadius: "50%",
                        background: STATUS_COLORS[stage.status] || ACCENT,
                      }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: TEXT_PRIMARY }}>{STATUS_CONFIG[stage.status].label}</span>
                      <span style={{ fontSize: 12, color: TEXT_MUTED }}>{stage.count}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: TEXT_PRIMARY }}>{formatCurrency(stage.revenue)}</span>
                  </div>
                  <div style={{ height: 6, background: "#F1F5F9", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 3, width, background: STATUS_COLORS[stage.status] || ACCENT }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Alertas */}
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: TEXT_PRIMARY, margin: "0 0 4px" }}>Oportunidades e Alertas</h2>
          <p style={{ fontSize: 12, color: TEXT_SECONDARY, margin: "0 0 20px" }}>Propostas que exigem atenção</p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: DANGER, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px" }}>Sem atualização</p>
              {stale.length > 0 ? stale.map((p) => (
                <div key={p.id} style={{ padding: "8px 0", borderBottom: `1px solid ${BORDER}` }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: TEXT_PRIMARY, margin: 0 }}>{p.customer_name}</p>
                  <p style={{ fontSize: 11, color: TEXT_MUTED, margin: "2px 0 0" }}>{p.customer_city} · {daysSince(p.created_at)} dias parado</p>
                </div>
              )) : <p style={{ fontSize: 12, color: TEXT_MUTED }}>Nenhum alerta</p>}
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#F59E0B", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px" }}>Em negociação</p>
              {inNegotiation.length > 0 ? inNegotiation.map((p) => (
                <div key={p.id} style={{ padding: "8px 0", borderBottom: `1px solid ${BORDER}` }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: TEXT_PRIMARY, margin: 0 }}>{p.customer_name}</p>
                  <p style={{ fontSize: 11, color: TEXT_MUTED, margin: "2px 0 0" }}>{formatCurrency(p.total_price)} · {daysSince(p.created_at)}d</p>
                </div>
              )) : <p style={{ fontSize: 12, color: TEXT_MUTED }}>Nenhuma negociação</p>}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ PIPELINE ═══ */}
      <div data-pdf-section style={{ padding: "0 48px 40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: TEXT_PRIMARY, margin: "0 0 4px" }}>Pipeline de Propostas</h2>
            <p style={{ fontSize: 12, color: TEXT_SECONDARY, margin: 0 }}>Acompanhamento das últimas {pipelineRows.length} propostas</p>
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              {["Cliente", "Cidade", "Modelo", "Status", "Prioridade", "Valor", "Dias"].map((h) => (
                <th key={h} style={{
                  textAlign: "left", padding: "10px 12px", borderBottom: `2px solid ${TEXT_PRIMARY}`,
                  fontSize: 10, fontWeight: 700, color: TEXT_SECONDARY, textTransform: "uppercase", letterSpacing: "0.08em",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pipelineRows.map((p, i) => {
              const priority = getPriority(p);
              const bg = i % 2 === 0 ? "#fff" : "#FAFBFC";
              return (
                <tr key={p.id} style={{ background: bg }}>
                  <td style={{ padding: "10px 12px", borderBottom: `1px solid ${BORDER}`, fontWeight: 600 }}>{p.customer_name}</td>
                  <td style={{ padding: "10px 12px", borderBottom: `1px solid ${BORDER}`, color: TEXT_SECONDARY }}>{p.customer_city}</td>
                  <td style={{ padding: "10px 12px", borderBottom: `1px solid ${BORDER}`, color: TEXT_SECONDARY }}>{p.pool_models?.name || "—"}</td>
                  <td style={{ padding: "10px 12px", borderBottom: `1px solid ${BORDER}` }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      fontSize: 11, fontWeight: 600, color: STATUS_COLORS[p.status] || TEXT_PRIMARY,
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: STATUS_COLORS[p.status] || ACCENT }} />
                      {STATUS_CONFIG[p.status].label}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", borderBottom: `1px solid ${BORDER}` }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      color: priority === "alta" ? DANGER : priority === "media" ? "#F59E0B" : SUCCESS,
                    }}>
                      {PRIORITY_CONFIG[priority].label}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", borderBottom: `1px solid ${BORDER}`, fontWeight: 700 }}>{formatCurrency(p.total_price)}</td>
                  <td style={{ padding: "10px 12px", borderBottom: `1px solid ${BORDER}`, color: TEXT_SECONDARY }}>{daysSince(p.created_at)}d</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ═══ FOOTER ═══ */}
      <div style={{ padding: "16px 48px", borderTop: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between" }}>
        <p style={{ fontSize: 10, color: TEXT_MUTED, margin: 0 }}>SIMULAPOOL · Relatório Comercial</p>
        <p style={{ fontSize: 10, color: TEXT_MUTED, margin: 0 }}>Documento confidencial · {reportDate}</p>
      </div>
    </div>
  );
};

export default DashboardPdfReport;
