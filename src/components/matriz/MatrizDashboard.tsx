import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp, TrendingDown, Users, DollarSign, AlertTriangle,
  BarChart3, Activity, FileDown, Eye, Phone,
  CheckCircle2, XCircle, ArrowUpRight, ArrowDownRight, RefreshCw, CalendarIcon,
} from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import BrazilMap from "./BrazilMap";
import { toast } from "sonner";
import { exportPDF } from "@/lib/exportPDF";

/* ─── helpers ─── */
const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v ?? 0);
const fmtCompact = (v: number) => {
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(1).replace(".", ",")}k`;
  return fmt(v);
};
const pct = (v: number) => (v ?? 0).toFixed(1) + "%";

const PLAN_BADGE: Record<string, string> = {
  basico: "bg-muted text-muted-foreground",
  pro: "bg-primary/10 text-primary",
  premium: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
};

const STATUS_BADGE: Record<string, { cls: string; label: string }> = {
  active: { cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", label: "Ativo" },
  past_due: { cls: "bg-destructive/10 text-destructive", label: "Inadimplente" },
  trial: { cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400", label: "Trial" },
  canceled: { cls: "bg-destructive/10 text-destructive", label: "Cancelado" },
  cancelled: { cls: "bg-destructive/10 text-destructive", label: "Cancelado" },
};

const MONTHS_PT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

interface StoreRow {
  id: string; name: string; city: string | null; state: string | null;
  plan_status: string | null; plan_id: string | null;
  created_at: string | null; plan_started_at: string | null;
  stripe_subscription_id: string | null;
  subscription_plans: { name: string; price_monthly: number; slug: string } | null;
}

interface DashboardData {
  stores: StoreRow[];
  proposals: { id: string; store_id: string | null; total_price: number; created_at: string | null; status: string }[];
  payments: { id: string; store_id: string; amount: number; status: string; payment_date: string | null }[];
}

/* ─── component ─── */
const MatrizDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");
  const [customRange, setCustomRange] = useState<{ from?: Date; to?: Date }>({});
  const reportRef = useRef<HTMLDivElement>(null);

  const handleViewStore = () => navigate(`/matriz/lojas`);

  const handleContact = async (storeId: string) => {
    const { data: store } = await supabase
      .from("stores").select("whatsapp, name").eq("id", storeId).maybeSingle();
    if (!store?.whatsapp) { toast.error("WhatsApp não cadastrado"); return; }
    const phone = store.whatsapp.replace(/\D/g, "");
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(`Olá ${store.name}! Aqui é da SimulaPool.`)}`, "_blank");
  };

  const loadAll = useCallback(async () => {
    const [storesRes, proposalsRes, paymentsRes] = await Promise.all([
      supabase.from("stores").select("id, name, city, state, plan_status, plan_id, created_at, plan_started_at, stripe_subscription_id, subscription_plans(name, price_monthly, slug)"),
      supabase.from("proposals").select("id, store_id, total_price, created_at, status"),
      supabase.from("payment_history").select("id, store_id, amount, status, payment_date"),
    ]);
    setData({ stores: (storesRes.data as any) || [], proposals: proposalsRes.data || [], payments: paymentsRes.data || [] });
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); const i = setInterval(loadAll, 30000); return () => clearInterval(i); }, [loadAll]);

  /* ── date range helper ── */
  const dateRange = useMemo(() => {
    const now = new Date();
    if (period === "custom" && customRange.from) {
      const from = new Date(customRange.from); from.setHours(0, 0, 0, 0);
      const to = customRange.to ? new Date(customRange.to) : new Date(from);
      to.setHours(23, 59, 59, 999);
      return { from, to };
    }
    const to = new Date(now); to.setHours(23, 59, 59, 999);
    const from = new Date(now); from.setHours(0, 0, 0, 0);
    if (period === "7d") from.setDate(from.getDate() - 6);
    else if (period === "month") from.setDate(1);
    else if (period === "12m") { from.setMonth(from.getMonth() - 11); from.setDate(1); }
    return { from, to };
  }, [period, customRange]);

  const inRange = useCallback((dateStr: string | null) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d >= dateRange.from && d <= dateRange.to;
  }, [dateRange]);

  const metrics = useMemo(() => {
    if (!data) return null;
    const { stores, proposals, payments } = data;
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    /* filter proposals & payments by selected period */
    const filteredProposals = proposals.filter(p => inRange(p.created_at));
    const filteredPayments = payments.filter(p => inRange(p.payment_date));

    const LIM_PISCINAS_ID = "5e8165c0-64b6-4d06-b274-8eeb261a79c4";
    const activeStores = stores.filter(s => s.plan_status === "active" || s.stripe_subscription_id);
    const activeCount = activeStores.length;
    const newThisMonth = stores.filter(s => inRange(s.created_at)).length;

    let mrr = 0;
    activeStores.forEach(s => { if (s.subscription_plans && s.id !== LIM_PISCINAS_ID) mrr += s.subscription_plans.price_monthly; });

    const lastMonthPayments = payments.filter(p => {
      if (!p.payment_date || p.status !== "paid") return false;
      const d = new Date(p.payment_date);
      const lm = thisMonth === 0 ? 11 : thisMonth - 1;
      const ly = thisMonth === 0 ? thisYear - 1 : thisYear;
      return d.getMonth() === lm && d.getFullYear() === ly;
    });
    const lastMRR = lastMonthPayments.reduce((a, p) => a + p.amount, 0) || mrr * 0.9;
    const mrrGrowth = lastMRR > 0 ? ((mrr - lastMRR) / lastMRR) * 100 : 0;

    const canceledThisMonth = stores.filter(s => s.plan_status === "canceled" || s.plan_status === "cancelled" || s.plan_status === "expired").length;
    const churnRate = activeCount > 0 ? (canceledThisMonth / (activeCount + canceledThisMonth)) * 100 : 0;

    const arpu = activeCount > 0 ? mrr / activeCount : 0;
    const ltv = churnRate > 0 ? arpu * (1 / (churnRate / 100)) : arpu * 24;
    const lostRevenue = canceledThisMonth * arpu;

    const simsThisMonth = filteredProposals.length;
    const lastMonthSims = proposals.filter(p => { if (!p.created_at) return false; const d = new Date(p.created_at); const lm = thisMonth === 0 ? 11 : thisMonth - 1; const ly = thisMonth === 0 ? thisYear - 1 : thisYear; return d.getMonth() === lm && d.getFullYear() === ly; }).length;
    const simsGrowth = lastMonthSims > 0 ? ((simsThisMonth - lastMonthSims) / lastMonthSims) * 100 : 0;

    const storeRevenue = new Map<string, number>();
    const storeProposalCount = new Map<string, number>();
    filteredProposals.filter(p => p.status === "fechada").forEach(p => { if (p.store_id) { storeRevenue.set(p.store_id, (storeRevenue.get(p.store_id) || 0) + p.total_price); storeProposalCount.set(p.store_id, (storeProposalCount.get(p.store_id) || 0) + 1); } });
    const ranking = stores.map(s => ({ ...s, revenue: storeRevenue.get(s.id) || 0, proposalCount: storeProposalCount.get(s.id) || 0, planName: s.subscription_plans?.name || "—", planSlug: s.subscription_plans?.slug || "" })).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

    const monthlyActive: { month: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) { const d = new Date(thisYear, thisMonth - i, 1); const label = MONTHS_PT[d.getMonth()] + "/" + String(d.getFullYear()).slice(2); const count = stores.filter(s => { if (!s.created_at) return false; const cd = new Date(s.created_at); return cd <= new Date(d.getFullYear(), d.getMonth() + 1, 0) && (s.plan_status === "active" || s.stripe_subscription_id); }).length; monthlyActive.push({ month: label, count }); }

    /* daily sims scoped to the selected range */
    const rangeDays = Math.max(1, Math.round((dateRange.to.getTime() - dateRange.from.getTime()) / 86400000) + 1);
    const dailySims: { day: string; count: number; isToday: boolean }[] = [];
    for (let i = rangeDays - 1; i >= 0; i--) { const d = new Date(dateRange.to); d.setDate(d.getDate() - i); const dayStr = `${d.getDate()}/${d.getMonth() + 1}`; const count = filteredProposals.filter(p => { if (!p.created_at) return false; const pd = new Date(p.created_at); return pd.getDate() === d.getDate() && pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear(); }).length; const today = new Date(); dailySims.push({ day: dayStr, count, isToday: d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear() }); }

    const alerts: { type: "red" | "yellow"; text: string }[] = [];
    if (churnRate > 5) alerts.push({ type: "red", text: `Churn elevado: ${pct(churnRate)}` });
    stores.filter(s => s.plan_status === "past_due").forEach(s => { alerts.push({ type: "red", text: `${s.name} inadimplente` }); });

    const stateMap = new Map<string, number>();
    activeStores.forEach(s => { if (s.state) stateMap.set(s.state, (stateMap.get(s.state) || 0) + 1); });
    const topStates = [...stateMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([state, count]) => ({ state, count }));
    const maxStateCount = topStates[0]?.count || 1;

    const netRate = 1 + (mrrGrowth / 100) - (churnRate / 100);
    const projections = [
      { label: "30d", value: mrr * netRate },
      { label: "90d", value: mrr * Math.pow(netRate, 3) },
      { label: "6m", value: mrr * Math.pow(netRate, 6) },
      { label: "1a", value: mrr * Math.pow(netRate, 12) },
    ];

    const paidInRange = filteredPayments.filter(p => p.status === "paid").reduce((a, p) => a + p.amount, 0);
    const recorrente = mrr;
    const excedente = Math.max(paidInRange - mrr, 0);
    const totalRev = recorrente + excedente;
    const recPct = totalRev > 0 ? (recorrente / totalRev) * 100 : 100;
    const exPct = totalRev > 0 ? (excedente / totalRev) * 100 : 0;

    return { mrr, mrrGrowth, churnRate, activeCount, newThisMonth, arpu, ltv, lostRevenue, simsThisMonth, simsGrowth, ranking, monthlyActive, dailySims, alerts, stateMap, topStates, maxStateCount, projections, recorrente, excedente, totalRev, recPct, exPct };
  }, [data, inRange, dateRange]);

  if (loading || !metrics) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[100px] rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Skeleton className="h-[280px] rounded-2xl" />
          <Skeleton className="h-[280px] rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5" ref={reportRef}>
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-semibold text-foreground tracking-tight">Visão geral</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">Atualizado em tempo real</p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => { loadAll(); toast.success("Dashboard atualizado"); }}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Select value={period} onValueChange={(v) => { setPeriod(v); if (v !== "custom") setCustomRange({}); }}>
            <SelectTrigger className="h-8 w-[130px] text-[12px] rounded-lg bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="7d">7 dias</SelectItem>
              <SelectItem value="month">Este mês</SelectItem>
              <SelectItem value="12m">12 meses</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
          {period === "custom" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-[12px] rounded-lg">
                  <CalendarIcon className="w-3.5 h-3.5" />
                  {customRange.from
                    ? customRange.to
                      ? `${format(customRange.from, "dd/MM", { locale: ptBR })} – ${format(customRange.to, "dd/MM", { locale: ptBR })}`
                      : format(customRange.from, "dd/MM/yy", { locale: ptBR })
                    : "Selecionar datas"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={customRange.from ? { from: customRange.from, to: customRange.to } : undefined}
                  onSelect={(range) => setCustomRange({ from: range?.from, to: range?.to })}
                  numberOfMonths={1}
                  locale={ptBR}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          )}
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-[12px]" onClick={async () => {
            if (!reportRef.current) return;
            await exportPDF({
              element: reportRef.current,
              filename: `dashboard-matriz-${new Date().toISOString().split("T")[0]}.pdf`,
              orientation: "portrait",
              captureWidth: 900,
              sectionSelector: "[data-pdf-section]",
            });
          }}>
            <FileDown className="w-3.5 h-3.5" /> PDF
          </Button>
        </div>
      </div>

      {/* ── KPIs ROW 1 ── */}
      <div data-pdf-section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="MRR" value={fmt(metrics.mrr)} change={metrics.mrrGrowth} />
        <MetricCard label="Lojistas ativos" value={String(metrics.activeCount)} subtitle={`+${metrics.newThisMonth} este mês`} />
        <MetricCard label="Churn" value={pct(metrics.churnRate)} status={metrics.churnRate > 5 ? "danger" : "success"} />
        <MetricCard label="Simulações" value={String(metrics.simsThisMonth)} change={metrics.simsGrowth} />
      </div>

      {/* ── KPIs ROW 2 ── */}
      <div data-pdf-section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="ARPU" value={fmt(metrics.arpu)} />
        <MetricCard label="LTV médio" value={fmt(metrics.ltv)} />
        <MetricCard label="Receita perdida" value={fmt(metrics.lostRevenue)} status={metrics.lostRevenue > 0 ? "danger" : undefined} />
        <MetricCard label="Crescimento MRR" value={pct(metrics.mrrGrowth)} change={metrics.mrrGrowth} />
      </div>

      {/* ── ALERTAS (inline, sem card amarelo gritante) ── */}
      {metrics.alerts.length > 0 && (
        <div data-pdf-section className="flex flex-wrap gap-2">
          {metrics.alerts.map((a, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="w-3 h-3" />
              {a.text}
            </span>
          ))}
        </div>
      )}
      {metrics.alerts.length === 0 && (
        <div data-pdf-section className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>Nenhum alerta ativo</span>
        </div>
      )}

      {/* ── GRÁFICOS ── */}
      <div data-pdf-section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ChartCard title="Lojistas ativos" subtitle="Últimos 12 meses">
          {metrics.monthlyActive.every(m => m.count === 0) ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={metrics.monthlyActive} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} interval="preserveStartEnd" tickMargin={6} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={32} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#areaGrad)" name="Lojistas" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Simulações" subtitle="Últimos 30 dias">
          {metrics.dailySims.every(d => d.count === 0) ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={metrics.dailySims} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <XAxis dataKey="day" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} interval={6} tickMargin={6} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={32} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" name="Simulações" radius={[3, 3, 0, 0]} maxBarSize={12}>
                  {metrics.dailySims.map((entry, idx) => (
                    <Cell key={idx} fill={entry.isToday ? "hsl(var(--foreground))" : "hsl(var(--primary))"} fillOpacity={entry.isToday ? 1 : 0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── PROJEÇÃO (compact) ── */}
      <div data-pdf-section className="bg-card border border-border rounded-2xl p-4">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-4">Projeção de receita</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {metrics.projections.map(p => (
            <div key={p.label} className="text-center bg-muted/40 rounded-xl py-3 px-2">
              <span className="text-[11px] text-muted-foreground font-medium">{p.label}</span>
              <p className="text-[18px] md:text-[22px] font-bold text-foreground mt-1 tabular-nums tracking-tight">{fmtCompact(p.value)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── COMPOSIÇÃO RECEITA (desktop only) ── */}
      <div data-pdf-section className="hidden md:grid grid-cols-1 lg:grid-cols-5 gap-3">
        <div className="lg:col-span-3 bg-card border border-border rounded-2xl p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-4">Composição da receita</p>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden flex">
              <div className="h-full bg-primary rounded-l-full transition-all" style={{ width: `${metrics.recPct}%` }} />
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${metrics.exPct}%` }} />
            </div>
          </div>
          <div className="flex items-center justify-between text-[12px]">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" />Recorrente <span className="text-muted-foreground">{fmt(metrics.recorrente)}</span></span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" />Excedente <span className="text-muted-foreground">{fmt(metrics.excedente)}</span></span>
            </div>
            <span className="font-semibold text-foreground">{fmt(metrics.totalRev)}</span>
          </div>
        </div>
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-4 flex items-center justify-center">
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={[{ name: "Recorrente", value: metrics.recorrente || 0.01 }, { name: "Excedente", value: metrics.excedente || 0.01 }]}
                cx="50%" cy="50%" innerRadius={38} outerRadius={58} dataKey="value" paddingAngle={3} strokeWidth={0}>
                <Cell fill="hsl(var(--primary))" /><Cell fill="#10B981" />
              </Pie>
              <Tooltip formatter={(v: number) => fmt(v)} contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── RANKING ── */}
      <div data-pdf-section className="bg-card border border-border rounded-2xl p-4">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-3">Top lojistas</p>
        <div className="space-y-0">
          {metrics.ranking.map((s, i) => {
            const planCls = PLAN_BADGE[s.planSlug] || PLAN_BADGE.basico;
            const statusKey = s.plan_status || "active";
            const sts = STATUS_BADGE[statusKey] || STATUS_BADGE.active;
            return (
              <div key={s.id} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
                <span className="text-[13px] font-semibold text-muted-foreground w-5 text-right tabular-nums">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-foreground truncate">{s.name}</p>
                  <p className="text-[11px] text-muted-foreground">{s.city || "—"}</p>
                </div>
                <span className={`hidden md:inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full ${planCls}`}>{s.planName}</span>
                <span className={`hidden md:inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full ${sts.cls}`}>{sts.label}</span>
                <span className="text-[13px] font-semibold text-foreground tabular-nums w-24 text-right">{fmt(s.revenue)}</span>
                <div className="hidden md:flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleViewStore}><Eye className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleContact(s.id)}><Phone className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            );
          })}
          {metrics.ranking.length === 0 && (
            <p className="text-[12px] text-muted-foreground text-center py-6">Nenhum lojista encontrado</p>
          )}
        </div>
      </div>

      {/* ── MAPA ── */}
      <div data-pdf-section className="bg-card border border-border rounded-2xl p-4">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-3">Distribuição geográfica</p>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <BrazilMap stateData={Object.fromEntries(metrics.stateMap)} stores={data!.stores.map(s => ({ id: s.id, name: s.name, city: s.city, state: s.state }))} />
          </div>
          <div className="space-y-2.5">
            <p className="text-[12px] font-medium text-foreground">Top estados</p>
            {metrics.topStates.map(ts => (
              <div key={ts.state} className="flex items-center gap-2">
                <span className="text-[12px] font-medium text-foreground w-8">{ts.state}</span>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(ts.count / metrics.maxStateCount) * 100}%` }} />
                </div>
                <span className="text-[11px] font-semibold text-foreground tabular-nums w-4 text-right">{ts.count}</span>
              </div>
            ))}
            {metrics.topStates.length === 0 && <p className="text-[11px] text-muted-foreground">Sem dados</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Sub-components ─── */

const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid hsl(var(--border))",
  fontSize: 11,
  background: "hsl(var(--popover))",
  color: "hsl(var(--popover-foreground))",
  boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
  padding: "6px 10px",
};

function MetricCard({ label, value, change, subtitle, status }: {
  label: string; value: string; change?: number; subtitle?: string; status?: "danger" | "success";
}) {
  const isPositive = change !== undefined ? change >= 0 : true;
  const valueColor = status === "danger" ? "text-destructive" : status === "success" ? "text-emerald-600 dark:text-emerald-400" : "text-foreground";
  
  return (
    <div className="bg-card border border-border rounded-2xl p-3.5 md:p-4">
      <p className="text-[10px] md:text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-[20px] md:text-[26px] font-semibold ${valueColor} mt-1 tabular-nums leading-none tracking-tight`}>{value}</p>
      {change !== undefined && (
        <span className={`inline-flex items-center gap-0.5 text-[10px] md:text-[11px] font-medium mt-1.5 ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
          {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {isPositive ? "+" : ""}{pct(change)}
        </span>
      )}
      {subtitle && <p className="text-[10px] md:text-[11px] text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-baseline justify-between mb-3">
        <p className="text-[13px] font-medium text-foreground">{title}</p>
        <span className="text-[10px] text-muted-foreground">{subtitle}</span>
      </div>
      {children}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
      <BarChart3 className="w-8 h-8 mb-2 opacity-20" />
      <span className="text-[11px]">Sem dados</span>
    </div>
  );
}

export default MatrizDashboard;
