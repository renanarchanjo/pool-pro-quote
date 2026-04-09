import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp, TrendingDown, Users, DollarSign, AlertTriangle,
  BarChart3, Activity, FileDown, Eye, Phone,
  CheckCircle2, XCircle,
} from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import BrazilMap from "./BrazilMap";
import { toast } from "sonner";

/* ─── helpers ─── */
const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v ?? 0);
const pct = (v: number) => (v ?? 0).toFixed(1) + "%";



const PLAN_BADGE: Record<string, { bg: string; text: string }> = {
  basico: { bg: "bg-muted", text: "text-muted-foreground" },
  pro: { bg: "bg-primary/10", text: "text-primary" },
  premium: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300" },
};

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-green-50 dark:bg-green-900/20", text: "text-green-600 dark:text-green-400", label: "Ativo" },
  past_due: { bg: "bg-red-50 dark:bg-red-900/20", text: "text-red-600 dark:text-red-400", label: "Inadimplente" },
  trial: { bg: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-600 dark:text-amber-400", label: "Trial" },
  canceled: { bg: "bg-red-50 dark:bg-red-900/20", text: "text-red-600 dark:text-red-400", label: "Cancelado" },
  cancelled: { bg: "bg-red-50 dark:bg-red-900/20", text: "text-red-600 dark:text-red-400", label: "Cancelado" },
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

  const handleViewStore = (storeId: string) => {
    navigate(`/matriz/lojas`);
  };

  const handleContact = async (storeId: string) => {
    const { data: store } = await supabase
      .from("stores")
      .select("whatsapp, name")
      .eq("id", storeId)
      .maybeSingle();
    if (!store?.whatsapp) {
      toast.error("WhatsApp não cadastrado para esta loja");
      return;
    }
    const phone = store.whatsapp.replace(/\D/g, "");
    const msg = encodeURIComponent(`Olá ${store.name}! Aqui é da SimulaPool.`);
    window.open(`https://wa.me/55${phone}?text=${msg}`, "_blank");
  };

  const loadAll = useCallback(async () => {
    const [storesRes, proposalsRes, paymentsRes] = await Promise.all([
      supabase.from("stores").select("id, name, city, state, plan_status, plan_id, created_at, plan_started_at, stripe_subscription_id, subscription_plans(name, price_monthly, slug)"),
      supabase.from("proposals").select("id, store_id, total_price, created_at, status"),
      supabase.from("payment_history").select("id, store_id, amount, status, payment_date"),
    ]);
    setData({
      stores: (storesRes.data as any) || [],
      proposals: proposalsRes.data || [],
      payments: paymentsRes.data || [],
    });
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); const i = setInterval(loadAll, 30000); return () => clearInterval(i); }, [loadAll]);

  const metrics = useMemo(() => {
    if (!data) return null;
    const { stores, proposals, payments } = data;
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const activeStores = stores.filter(s => s.plan_status === "active" || s.stripe_subscription_id);
    const activeCount = activeStores.length;

    const newThisMonth = stores.filter(s => {
      if (!s.created_at) return false;
      const d = new Date(s.created_at);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;

    let mrr = 0;
    activeStores.forEach(s => {
      if (s.subscription_plans) mrr += s.subscription_plans.price_monthly;
    });

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
    const ltv = churnRate > 0 ? arpu * (1 / (churnRate / 100)) : arpu * 12;
    const lostRevenue = canceledThisMonth * arpu;

    const simsThisMonth = proposals.filter(p => {
      if (!p.created_at) return false;
      const d = new Date(p.created_at);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;

    const lastMonthSims = proposals.filter(p => {
      if (!p.created_at) return false;
      const d = new Date(p.created_at);
      const lm = thisMonth === 0 ? 11 : thisMonth - 1;
      const ly = thisMonth === 0 ? thisYear - 1 : thisYear;
      return d.getMonth() === lm && d.getFullYear() === ly;
    }).length;
    const simsGrowth = lastMonthSims > 0 ? ((simsThisMonth - lastMonthSims) / lastMonthSims) * 100 : 0;

    // Ranking
    const storeRevenue = new Map<string, number>();
    const storeProposalCount = new Map<string, number>();
    proposals.filter(p => p.status === "fechada").forEach(p => {
      if (p.store_id) {
        storeRevenue.set(p.store_id, (storeRevenue.get(p.store_id) || 0) + p.total_price);
        storeProposalCount.set(p.store_id, (storeProposalCount.get(p.store_id) || 0) + 1);
      }
    });
    const ranking = stores
      .map(s => ({
        ...s,
        revenue: storeRevenue.get(s.id) || 0,
        proposalCount: storeProposalCount.get(s.id) || 0,
        planName: s.subscription_plans?.name || "—",
        planSlug: s.subscription_plans?.slug || "",
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // 12-month chart
    const monthlyActive: { month: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(thisYear, thisMonth - i, 1);
      const label = MONTHS_PT[d.getMonth()] + "/" + String(d.getFullYear()).slice(2);
      const count = stores.filter(s => {
        if (!s.created_at) return false;
        const cd = new Date(s.created_at);
        return cd <= new Date(d.getFullYear(), d.getMonth() + 1, 0) &&
          (s.plan_status === "active" || s.stripe_subscription_id);
      }).length;
      monthlyActive.push({ month: label, count });
    }

    // Daily sims
    const dailySims: { day: string; count: number; isToday: boolean }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dayStr = `${d.getDate()}/${d.getMonth() + 1}`;
      const count = proposals.filter(p => {
        if (!p.created_at) return false;
        const pd = new Date(p.created_at);
        return pd.getDate() === d.getDate() && pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
      }).length;
      dailySims.push({ day: dayStr, count, isToday: i === 0 });
    }

    // Alerts
    const alerts: { type: "red" | "yellow" | "blue"; text: string; date: string }[] = [];
    if (churnRate > 5) alerts.push({ type: "red", text: `Churn elevado este mês: ${pct(churnRate)}`, date: now.toLocaleDateString("pt-BR") });
    stores.filter(s => s.plan_status === "past_due").forEach(s => {
      alerts.push({ type: "red", text: `Inadimplência: ${s.name}`, date: now.toLocaleDateString("pt-BR") });
    });

    // State distribution
    const stateMap = new Map<string, number>();
    activeStores.forEach(s => { if (s.state) stateMap.set(s.state, (stateMap.get(s.state) || 0) + 1); });
    const topStates = [...stateMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([state, count]) => ({ state, count }));
    const maxStateCount = topStates[0]?.count || 1;

    // Projections
    const netRate = 1 + (mrrGrowth / 100) - (churnRate / 100);
    const projections = [
      { label: "30 dias", value: mrr * netRate, pctChange: ((netRate - 1) * 100) },
      { label: "60 dias", value: mrr * Math.pow(netRate, 2), pctChange: ((Math.pow(netRate, 2) - 1) * 100) },
      { label: "90 dias", value: mrr * Math.pow(netRate, 3), pctChange: ((Math.pow(netRate, 3) - 1) * 100) },
      { label: "6 meses", value: mrr * Math.pow(netRate, 6), pctChange: ((Math.pow(netRate, 6) - 1) * 100) },
      { label: "1 ano", value: mrr * Math.pow(netRate, 12), pctChange: ((Math.pow(netRate, 12) - 1) * 100) },
      { label: "2 anos", value: mrr * Math.pow(netRate, 24), pctChange: ((Math.pow(netRate, 24) - 1) * 100) },
    ];

    // Revenue composition
    const recorrente = mrr;
    const excedente = Math.max(payments.filter(p => p.status === "paid").reduce((a, p) => a + p.amount, 0) - mrr, 0);
    const totalRev = recorrente + excedente;
    const recPct = totalRev > 0 ? (recorrente / totalRev) * 100 : 100;
    const exPct = totalRev > 0 ? (excedente / totalRev) * 100 : 0;

    return {
      mrr, mrrGrowth, churnRate, activeCount, newThisMonth,
      arpu, ltv, lostRevenue, simsThisMonth, simsGrowth,
      ranking, monthlyActive, dailySims, alerts,
      stateMap, topStates, maxStateCount,
      projections, recorrente, excedente, totalRev, recPct, exPct,
    };
  }, [data]);

  if (loading || !metrics) {
    return (
      <div className="space-y-6 p-4 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-[120px] rounded-xl" />)}
        </div>
        <Skeleton className="h-[200px] rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[320px] rounded-xl" />
          <Skeleton className="h-[320px] rounded-xl" />
        </div>
      </div>
    );
  }

  const VariationBadge = ({ value, suffix = "vs mês anterior" }: { value: number; suffix?: string }) => {
    const positive = value >= 0;
    return (
      <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
        positive ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400" : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
      }`}>
        {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {positive ? "+" : ""}{pct(value)} {suffix}
      </span>
    );
  };

  return (
    <div className="space-y-6 p-4 md:p-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-[18px] font-semibold text-foreground">Dashboard Financeiro</h1>
          <p className="text-[13px] text-muted-foreground">Visão completa do sistema SimulaPool</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[160px] h-9 text-[13px] rounded-lg border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="7d">7 dias</SelectItem>
              <SelectItem value="month">Mês atual</SelectItem>
              <SelectItem value="12m">12 meses</SelectItem>
            </SelectContent>
          </Select>
          <button className="inline-flex items-center gap-2 h-9 pl-4 pr-3 text-[13px] font-semibold text-white bg-[#2d2d2d] rounded-full transition-all duration-150 hover:bg-[#1a1a1a] active:scale-95">
            PDF
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#dc2626]">
              <FileDown className="w-3.5 h-3.5 text-white" />
            </span>
          </button>
        </div>
      </div>

      {/* BLOCO 1 — KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard label="MRR" value={fmt(metrics.mrr)} icon={DollarSign} badge={<VariationBadge value={metrics.mrrGrowth} />} />
        <KPICard label="CRESCIMENTO MRR" value={pct(metrics.mrrGrowth)} icon={TrendingUp} badge={<VariationBadge value={metrics.mrrGrowth} />} />
        <KPICard label="CHURN MENSAL" value={pct(metrics.churnRate)} icon={Activity}
          badge={<span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full ${metrics.churnRate > 5 ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400" : "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"}`}>{metrics.churnRate > 5 ? "⚠ Acima de 5%" : "✓ Saudável"}</span>} />
        <KPICard label="LOJISTAS ATIVOS" value={String(metrics.activeCount)} icon={Users}
          badge={<span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">+{metrics.newThisMonth} novos este mês</span>} />
      </div>

      {/* BLOCO 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard label="ARPU" value={fmt(metrics.arpu)} icon={DollarSign} />
        <KPICard label="LTV MÉDIO" value={fmt(metrics.ltv)} icon={BarChart3} />
        <KPICard label="RECEITA PERDIDA" value={fmt(metrics.lostRevenue)} icon={XCircle} valueColor={metrics.lostRevenue > 0 ? "text-destructive" : undefined} />
        <KPICard label="SIMULAÇÕES NO MÊS" value={String(metrics.simsThisMonth)} icon={Activity} badge={<VariationBadge value={metrics.simsGrowth} />} />
      </div>

      {/* BLOCO 3 — ALERTAS */}
      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-300 dark:border-amber-700 rounded-xl p-6">
        <h3 className="text-[14px] font-semibold text-amber-800 dark:text-amber-300 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Alertas do Sistema
        </h3>
        {metrics.alerts.length === 0 ? (
          <span className="inline-flex items-center gap-2 text-[13px] font-medium px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-4 h-4" /> Todos os sistemas normais
          </span>
        ) : (
          <div className="space-y-3">
            {metrics.alerts.map((a, i) => (
              <div key={i} className="flex items-center gap-3 text-[13px]">
                <span className={`w-2 h-2 rounded-full shrink-0 ${a.type === "red" ? "bg-destructive" : a.type === "yellow" ? "bg-amber-500" : "bg-primary"}`} />
                <span className="flex-1 text-amber-800 dark:text-amber-300">{a.text}</span>
                <span className="text-[11px] text-amber-700/60 dark:text-amber-400/60">{a.date}</span>
                <Button variant="ghost" size="sm" className="h-7 text-[11px] text-amber-800 dark:text-amber-300">Ver</Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BLOCO 4 — GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-card border border-border rounded-xl p-3 md:p-6">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">CRESCIMENTO</span>
          <h3 className="text-[14px] md:text-[15px] font-semibold text-foreground mt-1 mb-3 md:mb-4">Crescimento de Lojistas Ativos</h3>
          {metrics.monthlyActive.every(m => m.count === 0) ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={metrics.monthlyActive} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} interval="preserveStartEnd" tickMargin={8} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12, background: "hsl(var(--card))", color: "hsl(var(--foreground))" }} />
                <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#areaFill)" name="Lojistas" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-3 md:p-6">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">ATIVIDADE</span>
          <h3 className="text-[14px] md:text-[15px] font-semibold text-foreground mt-1 mb-3 md:mb-4">Simulações por Dia</h3>
          {metrics.dailySims.every(d => d.count === 0) ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={metrics.dailySims} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} interval={6} tickMargin={8} angle={-35} textAnchor="end" height={40} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12, background: "hsl(var(--card))", color: "hsl(var(--foreground))" }} />
                <Bar dataKey="count" name="Simulações" radius={[3, 3, 0, 0]} maxBarSize={16}>
                  {metrics.dailySims.map((entry, idx) => (
                    <Cell key={idx} fill={entry.isToday ? "#0284C7" : "hsl(var(--primary))"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* BLOCO 5 — RANKING */}
      <div className="bg-card border border-border rounded-xl p-6">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">TOP LOJISTAS POR FATURAMENTO</span>
        <h3 className="text-[15px] font-semibold text-foreground mt-1 mb-4">Ranking do mês</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted">
                {["#", "Loja", "Plano", "Propostas", "Faturamento", "Status", "Ações"].map(h => (
                  <th key={h} className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground px-4 py-3 text-left first:rounded-tl-lg last:rounded-tr-lg">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.ranking.map((s, i) => {
                const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : String(i + 1);
                const planStyle = PLAN_BADGE[s.planSlug] || PLAN_BADGE.basico;
                const statusKey = s.plan_status || "active";
                const statusStyle = STATUS_BADGE[statusKey] || STATUS_BADGE.active;
                return (
                  <tr key={s.id} className="border-b border-border hover:bg-muted/50 h-[52px]">
                    <td className="px-4 text-[14px] text-foreground">{medal}</td>
                    <td className="px-4">
                      <div className="text-[14px] font-medium text-foreground">{s.name}</div>
                      <div className="text-[12px] text-muted-foreground">{s.city || "—"}</div>
                    </td>
                    <td className="px-4"><span className={`inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full ${planStyle.bg} ${planStyle.text}`}>{s.planName}</span></td>
                    <td className="px-4 text-[14px] text-foreground">{s.proposalCount}</td>
                    <td className="px-4 text-[14px] font-semibold text-foreground">{fmt(s.revenue)}</td>
                    <td className="px-4"><span className={`inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full ${statusStyle.bg} ${statusStyle.text}`}>{statusStyle.label}</span></td>
                    <td className="px-4">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1" onClick={() => handleViewStore(s.id)}><Eye className="w-3 h-3" /> Ver</Button>
                        <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1" onClick={() => handleContact(s.id)}><Phone className="w-3 h-3" /> Contato</Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {metrics.ranking.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-[13px] text-muted-foreground">Nenhum lojista encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* BLOCO 6 — MAPA */}
      <div className="bg-card border border-border rounded-xl p-6">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">DISTRIBUIÇÃO GEOGRÁFICA</span>
        <h3 className="text-[15px] font-semibold text-foreground mt-1 mb-4">Lojistas por estado</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <BrazilMap stateData={Object.fromEntries(metrics.stateMap)} stores={data.stores.map(s => ({ id: s.id, name: s.name, city: s.city, state: s.state }))} />
          </div>
          <div className="space-y-3">
            <h4 className="text-[13px] font-semibold text-foreground">Top 5 Estados</h4>
            {metrics.topStates.map(ts => (
              <div key={ts.state}>
                <div className="flex justify-between text-[14px] mb-1">
                  <span className="font-medium text-foreground">{ts.state}</span>
                  <span className="font-semibold text-primary">{ts.count}</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(ts.count / metrics.maxStateCount) * 100}%` }} />
                </div>
              </div>
            ))}
            {metrics.topStates.length === 0 && <p className="text-[13px] text-muted-foreground">Nenhum dado</p>}
          </div>
        </div>
      </div>

      {/* BLOCO 7 — PROJEÇÃO */}
      <div className="bg-card border border-border rounded-xl p-6">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">PROJEÇÃO DE FATURAMENTO</span>
        <p className="text-[12px] text-muted-foreground mt-1 mb-4">Base: MRR {fmt(metrics.mrr)} · Crescimento: {pct(metrics.mrrGrowth)} · Churn: {pct(metrics.churnRate)}</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {metrics.projections.map(p => (
            <div key={p.label} className="text-center">
              <div className="text-[12px] font-medium text-muted-foreground">{p.label}</div>
              <div className="text-[20px] font-bold text-foreground mt-1">{fmt(p.value)}</div>
              <VariationBadge value={p.pctChange} suffix="" />
            </div>
          ))}
        </div>
      </div>

      {/* BLOCO 8 — COMPOSIÇÃO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">COMPOSIÇÃO DA RECEITA</span>
          <div className="mt-4 space-y-4">
            <RevenueRow label="Recorrente (Planos)" value={metrics.recorrente} pctVal={metrics.recPct} color="hsl(var(--primary))" />
            <RevenueRow label="Excedente (Uso)" value={metrics.excedente} pctVal={metrics.exPct} color="#22C55E" />
            <div className="border-t border-border pt-3 flex justify-between items-center">
              <span className="text-[14px] font-semibold text-foreground">Receita Total</span>
              <span className="text-[16px] font-bold text-foreground">{fmt(metrics.totalRev)}</span>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={[{ name: "Recorrente", value: metrics.recorrente || 0.01 }, { name: "Excedente", value: metrics.excedente || 0.01 }]}
                cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={2}>
                <Cell fill="hsl(var(--primary))" /><Cell fill="#22C55E" />
              </Pie>
              <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12, background: "hsl(var(--card))", color: "hsl(var(--foreground))" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex gap-6 text-[12px] text-foreground">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-primary" /> Recorrente</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-green-500" /> Excedente</div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── sub-components ─── */
function KPICard({ label, value, icon: Icon, badge, valueColor }: {
  label: string; value: string; icon: any; badge?: React.ReactNode; valueColor?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" strokeWidth={1.5} />
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</span>
      </div>
      <div className={`text-[24px] font-bold ${valueColor || "text-foreground"}`}>{value}</div>
      {badge && <div className="mt-2">{badge}</div>}
    </div>
  );
}

function RevenueRow({ label, value, pctVal, color }: { label: string; value: number; pctVal: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-[13px] mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold text-foreground">{fmt(value)} <span className="text-muted-foreground font-normal">({pct(pctVal)})</span></span>
      </div>
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pctVal}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex flex-col items-center justify-center h-[260px] text-muted-foreground">
      <BarChart3 className="w-10 h-10 mb-2 opacity-30" />
      <span className="text-[13px]">Nenhum dado ainda</span>
    </div>
  );
}

export default MatrizDashboard;
