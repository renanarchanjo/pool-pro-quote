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

const ACCENT = "#0EA5E9";
const BORDER = "#E2E8F0";
const TEXT_PRIMARY = "#0F172A";
const TEXT_SECONDARY = "#64748B";
const TEXT_MUTED = "#94A3B8";
const SUCCESS = "#059669";

const formatCurrency = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

const TeamPerformancePdfReport = ({ dateLabel, totals, metrics }: Props) => {
  const reportDate = new Date().toLocaleDateString("pt-BR");
  const reportTime = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const maxRevenue = Math.max(...metrics.map((m) => m.revenueClosed), 1);

  return (
    <div style={{ width: 1100, background: "#fff", color: TEXT_PRIMARY, fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif", padding: 0 }}>

      {/* ═══ HEADER ═══ */}
      <div data-pdf-section style={{ padding: "40px 48px 28px", borderBottom: `2px solid ${ACCENT}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ fontSize: 11, color: TEXT_MUTED, letterSpacing: "0.12em", textTransform: "uppercase", margin: 0 }}>Relatório de Equipe</p>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: "6px 0 0", letterSpacing: "-0.02em", color: TEXT_PRIMARY }}>Performance da Equipe</h1>
            <p style={{ fontSize: 13, color: TEXT_SECONDARY, margin: "8px 0 0" }}>
              Período: {dateLabel} · Gerado em {reportDate} às {reportTime}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 36, fontWeight: 700, color: ACCENT, margin: 0, lineHeight: 1 }}>{metrics.length}</p>
            <p style={{ fontSize: 12, color: TEXT_SECONDARY, margin: "4px 0 0" }}>membros ativos</p>
          </div>
        </div>
      </div>

      {/* ═══ RESUMO EXECUTIVO ═══ */}
      <div data-pdf-section style={{ padding: "32px 48px", pageBreakInside: "avoid" }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: TEXT_PRIMARY, margin: "0 0 4px" }}>Resumo Consolidado</h2>
        <p style={{ fontSize: 12, color: TEXT_SECONDARY, margin: "0 0 20px" }}>Visão geral da performance da equipe no período</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 0, borderTop: `1px solid ${BORDER}`, borderLeft: `1px solid ${BORDER}` }}>
          {[
            { label: "Leads Aceitos", value: `${totals.leads}` },
            { label: "Fechamentos", value: `${totals.closed}` },
            { label: "Conversão", value: `${totals.conversionRate.toFixed(1)}%` },
            { label: "Receita Fechada", value: formatCurrency(totals.revenue) },
            { label: "Receita Prevista", value: formatCurrency(totals.predicted) },
          ].map((item) => (
            <div key={item.label} style={{ padding: "20px 20px", borderRight: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, textAlign: "center" }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>{item.label}</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: TEXT_PRIMARY, margin: "10px 0 0", lineHeight: 1 }}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ RANKING DA EQUIPE ═══ */}
      <div data-pdf-section style={{ padding: "0 48px 16px" }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: TEXT_PRIMARY, margin: "0 0 4px" }}>Ranking Individual</h2>
        <p style={{ fontSize: 12, color: TEXT_SECONDARY, margin: "0 0 20px" }}>Desempenho detalhado por membro da equipe</p>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              {["#", "Membro", "Leads", "Fechados", "Perdidos", "Conversão", "Ticket Médio", "Resposta", "Receita Fechada", "Prevista"].map((h) => (
                <th key={h} style={{
                  textAlign: h === "#" ? "center" : "left", padding: "10px 10px",
                  borderBottom: `2px solid ${TEXT_PRIMARY}`,
                  fontSize: 10, fontWeight: 700, color: TEXT_SECONDARY, textTransform: "uppercase", letterSpacing: "0.06em",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((m, idx) => {
              const bg = idx % 2 === 0 ? "#fff" : "#FAFBFC";
              const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`;
              return (
                <tr key={m.memberId} style={{ background: bg }}>
                  <td style={{ padding: "12px 10px", borderBottom: `1px solid ${BORDER}`, textAlign: "center", fontSize: idx < 3 ? 16 : 12, fontWeight: 600 }}>{medal}</td>
                  <td style={{ padding: "12px 10px", borderBottom: `1px solid ${BORDER}`, fontWeight: 700, fontSize: 13 }}>{m.name}</td>
                  <td style={{ padding: "12px 10px", borderBottom: `1px solid ${BORDER}`, color: TEXT_SECONDARY }}>{m.leadsAccepted}</td>
                  <td style={{ padding: "12px 10px", borderBottom: `1px solid ${BORDER}`, color: SUCCESS, fontWeight: 600 }}>{m.closed}</td>
                  <td style={{ padding: "12px 10px", borderBottom: `1px solid ${BORDER}`, color: m.lost > 0 ? "#DC2626" : TEXT_MUTED }}>{m.lost}</td>
                  <td style={{ padding: "12px 10px", borderBottom: `1px solid ${BORDER}`, fontWeight: 600 }}>{m.conversionRate.toFixed(1)}%</td>
                  <td style={{ padding: "12px 10px", borderBottom: `1px solid ${BORDER}`, color: TEXT_SECONDARY }}>{formatCurrency(m.ticketMedio)}</td>
                  <td style={{ padding: "12px 10px", borderBottom: `1px solid ${BORDER}`, color: TEXT_SECONDARY }}>
                    {m.avgResponseTimeHours < 1 ? `${Math.round(m.avgResponseTimeHours * 60)}min` : `${m.avgResponseTimeHours.toFixed(1)}h`}
                  </td>
                  <td style={{ padding: "12px 10px", borderBottom: `1px solid ${BORDER}`, fontWeight: 700, fontSize: 13 }}>{formatCurrency(m.revenueClosed)}</td>
                  <td style={{ padding: "12px 10px", borderBottom: `1px solid ${BORDER}`, color: TEXT_SECONDARY }}>{formatCurrency(m.revenuePredicted)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ═══ BARRA DE RECEITA ═══ */}
      <div data-pdf-section style={{ padding: "16px 48px 32px", pageBreakInside: "avoid" }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: TEXT_PRIMARY, margin: "0 0 16px" }}>Receita por Membro</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {metrics.map((m, idx) => {
            const pct = (m.revenueClosed / maxRevenue) * 100;
            return (
              <div key={m.memberId} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 120, fontSize: 12, fontWeight: 600, color: TEXT_PRIMARY, textAlign: "right", flexShrink: 0 }}>{m.name}</span>
                <div style={{ flex: 1, height: 20, background: "#F1F5F9", borderRadius: 4, overflow: "hidden", position: "relative" }}>
                  <div style={{ height: "100%", borderRadius: 4, width: `${Math.max(pct, 2)}%`, background: idx === 0 ? ACCENT : idx === 1 ? "#38BDF8" : idx === 2 ? "#7DD3FC" : "#BAE6FD" }} />
                </div>
                <span style={{ width: 130, fontSize: 12, fontWeight: 700, color: TEXT_PRIMARY, textAlign: "right", flexShrink: 0 }}>{formatCurrency(m.revenueClosed)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ FOOTER ═══ */}
      <div style={{ padding: "16px 48px", borderTop: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between" }}>
        <p style={{ fontSize: 10, color: TEXT_MUTED, margin: 0 }}>SIMULAPOOL · Relatório de Performance</p>
        <p style={{ fontSize: 10, color: TEXT_MUTED, margin: 0 }}>Documento confidencial · {reportDate}</p>
      </div>
    </div>
  );
};

export default TeamPerformancePdfReport;
