import { useEffect, useState, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, CheckCircle2, Store, Search, Calendar, DollarSign, TrendingDown, Clock, FileDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { exportPDF } from "@/lib/exportPDF";



const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const fmtDate = (d: string | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
};

interface StoreRow {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  plan_status: string | null;
  plan_expires_at: string | null;
  created_at: string | null;
  subscription_plans: { name: string; price_monthly: number } | null;
}

interface PaymentRow {
  id: string;
  amount: number;
  status: string;
  payment_date: string | null;
  store_id: string;
  stores: { name: string } | null;
  subscription_plans: { name: string } | null;
}

const MatrizInadimplencia = () => {
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const pdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const [storesRes, paymentsRes] = await Promise.all([
        supabase
          .from("stores")
          .select("id, name, city, state, plan_status, plan_expires_at, created_at, subscription_plans(name, price_monthly)")
          .order("created_at", { ascending: false })
          .limit(5000),
        supabase
          .from("payment_history")
          .select("id, amount, status, payment_date, store_id, stores(name), subscription_plans(name)")
          .in("status", ["pending", "failed", "past_due", "unpaid"])
          .order("payment_date", { ascending: false })
          .limit(500),
      ]);
      setStores((storesRes.data as any) || []);
      setPayments((paymentsRes.data as any) || []);
      setLoading(false);
    };
    load();
  }, []);

  const inadimplentes = useMemo(
    () => stores.filter((s) => s.plan_status === "past_due" || s.plan_status === "canceled" || s.plan_status === "inactive"),
    [stores]
  );

  const atRisk = useMemo(() => {
    const now = new Date();
    return stores.filter((s) => {
      if (s.plan_status !== "active" || !s.plan_expires_at) return false;
      const exp = new Date(s.plan_expires_at);
      const diff = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return diff <= 7 && diff >= 0;
    });
  }, [stores]);

  const receitaPerdida = useMemo(
    () => inadimplentes.reduce((acc, s) => acc + (s.subscription_plans?.price_monthly || 0), 0),
    [inadimplentes]
  );

  const filtered = useMemo(() => {
    let list = filterStatus === "all"
      ? [...inadimplentes, ...atRisk]
      : filterStatus === "past_due"
        ? inadimplentes
        : atRisk;

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q) || (s.city || "").toLowerCase().includes(q));
    }
    return list;
  }, [inadimplentes, atRisk, search, filterStatus]);

  const daysOverdue = (s: StoreRow) => {
    if (!s.plan_expires_at) return 0;
    const diff = (Date.now() - new Date(s.plan_expires_at).getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.floor(diff));
  };

  const statusLabel = (status: string | null) => {
    if (status === "past_due") return "Inadimplente";
    if (status === "canceled") return "Cancelado";
    if (status === "inactive") return "Inativo";
    if (status === "active") return "Risco";
    return status || "—";
  };

  const handleExportPDF = () => {
    if (!pdfRef.current) return;
    exportPDF({
      element: pdfRef.current,
      filename: `inadimplencia-remarketing-${new Date().toISOString().slice(0, 10)}.pdf`,
      orientation: "portrait",
      captureWidth: 800,
    });
  };

  const statusBadge = (status: string | null) => {
    if (status === "past_due")
      return <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">Inadimplente</span>;
    if (status === "canceled")
      return <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">Cancelado</span>;
    if (status === "active")
      return <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">Risco</span>;
    return <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{status || "—"}</span>;
  };

  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-8">
        <Skeleton className="h-8 w-64 rounded-lg" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-[400px] rounded-xl" />
      </div>
    );
  }

  const hasIssues = inadimplentes.length > 0 || atRisk.length > 0 || payments.length > 0;

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold text-foreground">Inadimplência</h1>
          <p className="text-[13px] text-muted-foreground">Monitoramento de pagamentos e lojistas em risco</p>
        </div>
        {hasIssues && (
          <Button variant="outline" size="sm" onClick={handleExportPDF} data-no-pdf>
            <FileDown className="w-4 h-4 mr-1.5" /> Gerar PDF
          </Button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard icon={AlertTriangle} label="INADIMPLENTES" value={String(inadimplentes.length)} color={inadimplentes.length > 0 ? "text-red-600 dark:text-red-400" : undefined} />
        <KPICard icon={Clock} label="EM RISCO (7 DIAS)" value={String(atRisk.length)} color={atRisk.length > 0 ? "text-amber-600 dark:text-amber-400" : undefined} />
        <KPICard icon={DollarSign} label="RECEITA PERDIDA" value={fmt(receitaPerdida)} color={receitaPerdida > 0 ? "text-red-600 dark:text-red-400" : undefined} />
        <KPICard icon={TrendingDown} label="TAXA INADIMPLÊNCIA" value={stores.length > 0 ? ((inadimplentes.length / stores.length) * 100).toFixed(1) + "%" : "0%"} color={inadimplentes.length / (stores.length || 1) > 0.05 ? "text-red-600 dark:text-red-400" : undefined} />
      </div>

      {!hasIssues ? (
        /* Empty state — all good */
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 dark:bg-green-900/20 mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-[16px] font-semibold text-foreground mb-2">Tudo em dia!</h3>
          <p className="text-[13px] text-muted-foreground max-w-md mx-auto">
            Nenhum lojista inadimplente ou em risco no momento. Todos os pagamentos estão em dia.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 dark:bg-green-900/20">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[12px] font-medium text-green-700 dark:text-green-400">Sistema saudável</span>
          </div>
        </div>
      ) : (
        <>
          {/* Alertas */}
          {(inadimplentes.length > 0 || atRisk.length > 0) && (
            <div className="bg-amber-50/50 dark:bg-amber-900/10 border border-amber-300 dark:border-amber-700 rounded-xl p-5">
              <h3 className="text-[14px] font-semibold text-amber-800 dark:text-amber-300 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Alertas de Inadimplência
              </h3>
              <div className="space-y-2">
                {inadimplentes.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 text-[13px]">
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                    <span className="text-red-700 dark:text-red-400 font-medium">{s.name}</span>
                    <span className="text-muted-foreground">— {daysOverdue(s)} dias em atraso</span>
                    <span className="ml-auto text-muted-foreground">{s.subscription_plans?.name || "—"} · {fmt(s.subscription_plans?.price_monthly || 0)}/mês</span>
                  </div>
                ))}
                {atRisk.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 text-[13px]">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <span className="text-amber-700 dark:text-amber-400 font-medium">{s.name}</span>
                    <span className="text-muted-foreground">— vence em {Math.ceil((new Date(s.plan_expires_at!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} dias</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabela de lojistas */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">MONITORAMENTO</span>
                <h3 className="text-[15px] font-semibold text-foreground mt-1">Lojistas com pendências</h3>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Buscar loja..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-[13px] w-[200px] rounded-lg" />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[160px] h-9 text-[13px] rounded-lg">
                    <SelectValue placeholder="Filtrar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="past_due">Inadimplentes</SelectItem>
                    <SelectItem value="at_risk">Em risco</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted">
                    {["Loja", "Cidade", "Estado", "Plano", "Valor", "Status", "Dias em atraso"].map((h) => (
                      <th key={h} className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground px-4 py-3 text-left first:rounded-tl-lg last:rounded-tr-lg">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.id} className="border-b border-border hover:bg-muted/50 h-[48px]">
                      <td className="px-4">
                        <div className="flex items-center gap-2">
                          <Store className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="text-[14px] font-medium text-foreground">{s.name}</span>
                        </div>
                      </td>
                      <td className="px-4 text-[13px] text-muted-foreground">{s.city || "—"}</td>
                      <td className="px-4 text-[13px] text-foreground font-medium">{s.state || "—"}</td>
                      <td className="px-4 text-[13px] text-muted-foreground">{s.subscription_plans?.name || "—"}</td>
                      <td className="px-4 text-[13px] text-foreground font-medium">{fmt(s.subscription_plans?.price_monthly || 0)}</td>
                      <td className="px-4">{statusBadge(s.plan_status)}</td>
                      <td className="px-4 text-[13px] font-semibold text-foreground">{s.plan_status !== "active" ? daysOverdue(s) : "—"}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-[13px] text-muted-foreground">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        Nenhum lojista encontrado com este filtro
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="text-[12px] text-muted-foreground mt-3">{filtered.length} lojista(s)</div>
          </div>

          {/* Histórico de pagamentos pendentes */}
          {payments.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-6">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">HISTÓRICO</span>
              <h3 className="text-[15px] font-semibold text-foreground mt-1 mb-4">Pagamentos pendentes ou falhos</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted">
                      {["Loja", "Plano", "Valor", "Status", "Data"].map((h) => (
                        <th key={h} className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground px-4 py-3 text-left first:rounded-tl-lg last:rounded-tr-lg">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-b border-border hover:bg-muted/50 h-[48px]">
                        <td className="px-4 text-[14px] font-medium text-foreground">{p.stores?.name || "—"}</td>
                        <td className="px-4 text-[13px] text-muted-foreground">{p.subscription_plans?.name || "—"}</td>
                        <td className="px-4 text-[13px] text-foreground font-medium">{fmt(p.amount)}</td>
                        <td className="px-4">
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                            {p.status === "failed" ? "Falhou" : p.status === "pending" ? "Pendente" : p.status}
                          </span>
                        </td>
                        <td className="px-4 text-[13px] text-muted-foreground">{fmtDate(p.payment_date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>

      {/* Hidden PDF content for remarketing */}
      <div ref={pdfRef} className="hidden" aria-hidden="true">
        <div style={{ fontFamily: "sans-serif", padding: "32px", color: "#111" }}>
          <h1 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "4px" }}>
            Relatório de Inadimplência — Remarketing
          </h1>
          <p style={{ fontSize: "12px", color: "#666", marginBottom: "24px" }}>
            Gerado em {new Date().toLocaleDateString("pt-BR")} · SimulaPool
          </p>

          {/* Summary */}
          <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
            {[
              { label: "Inadimplentes", value: String(inadimplentes.length) },
              { label: "Em Risco", value: String(atRisk.length) },
              { label: "Receita Perdida", value: fmt(receitaPerdida) },
            ].map((k) => (
              <div key={k.label} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "12px 20px", minWidth: "140px" }}>
                <div style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", color: "#888", letterSpacing: "0.05em" }}>{k.label}</div>
                <div style={{ fontSize: "20px", fontWeight: 700, marginTop: "4px" }}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* Inadimplentes table */}
          {inadimplentes.length > 0 && (
            <div style={{ marginBottom: "24px" }}>
              <h2 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px", color: "#dc2626" }}>🔴 Lojistas Inadimplentes</h2>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead>
                  <tr style={{ background: "#f3f4f6" }}>
                    {["Loja", "Cidade/UF", "Plano", "Valor/mês", "Status", "Dias atraso"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontWeight: 600, fontSize: "10px", textTransform: "uppercase", color: "#666", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inadimplentes.map(s => (
                    <tr key={s.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "8px 10px", fontWeight: 600 }}>{s.name}</td>
                      <td style={{ padding: "8px 10px", color: "#666" }}>{s.city || "—"}/{s.state || "—"}</td>
                      <td style={{ padding: "8px 10px", color: "#666" }}>{s.subscription_plans?.name || "—"}</td>
                      <td style={{ padding: "8px 10px", fontWeight: 600 }}>{fmt(s.subscription_plans?.price_monthly || 0)}</td>
                      <td style={{ padding: "8px 10px" }}>
                        <span style={{ background: "#fef2f2", color: "#dc2626", padding: "2px 8px", borderRadius: "99px", fontSize: "10px", fontWeight: 600 }}>{statusLabel(s.plan_status)}</span>
                      </td>
                      <td style={{ padding: "8px 10px", fontWeight: 700 }}>{daysOverdue(s)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* At risk table */}
          {atRisk.length > 0 && (
            <div style={{ marginBottom: "24px" }}>
              <h2 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px", color: "#d97706" }}>🟡 Lojistas em Risco (vencendo em 7 dias)</h2>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead>
                  <tr style={{ background: "#f3f4f6" }}>
                    {["Loja", "Cidade/UF", "Plano", "Valor/mês", "Vencimento"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontWeight: 600, fontSize: "10px", textTransform: "uppercase", color: "#666", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {atRisk.map(s => (
                    <tr key={s.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "8px 10px", fontWeight: 600 }}>{s.name}</td>
                      <td style={{ padding: "8px 10px", color: "#666" }}>{s.city || "—"}/{s.state || "—"}</td>
                      <td style={{ padding: "8px 10px", color: "#666" }}>{s.subscription_plans?.name || "—"}</td>
                      <td style={{ padding: "8px 10px", fontWeight: 600 }}>{fmt(s.subscription_plans?.price_monthly || 0)}</td>
                      <td style={{ padding: "8px 10px" }}>
                        <span style={{ background: "#fffbeb", color: "#d97706", padding: "2px 8px", borderRadius: "99px", fontSize: "10px", fontWeight: 600 }}>
                          {fmtDate(s.plan_expires_at)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p style={{ fontSize: "10px", color: "#999", marginTop: "20px", borderTop: "1px solid #e5e7eb", paddingTop: "12px" }}>
            Documento gerado automaticamente pela plataforma SimulaPool para fins de remarketing e recuperação de clientes.
          </p>
        </div>
      </div>
    </div>
  );
};

function KPICard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-[11px] font-semibold uppercase text-muted-foreground">{label}</span>
      </div>
      <div className={`text-[22px] font-bold ${color || "text-foreground"}`}>{value}</div>
    </div>
  );
}

export default MatrizInadimplencia;
