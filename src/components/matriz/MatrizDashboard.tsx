import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, TrendingDown, DollarSign, Users, AlertTriangle, ShieldAlert, BarChart3, Target, Clock, Minus } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

/* ─── Types ─── */
interface StoreRow {
  id: string;
  name: string;
  plan_status: string | null;
  plan_started_at: string | null;
  created_at: string | null;
  subscription_plans: { name: string; price_monthly: number; slug: string } | null;
}

interface PaymentRow {
  id: string;
  amount: number;
  status: string;
  payment_date: string | null;
  store_id: string;
  plan_id: string | null;
  subscription_plans: { name: string; price_monthly: number } | null;
}

interface ProposalRow {
  id: string;
  total_price: number;
  status: string;
  store_id: string | null;
  created_at: string | null;
}

interface DashboardData {
  stores: StoreRow[];
  payments: PaymentRow[];
  profileCount: number;
  closedProposals: ProposalRow[];
}

/* ─── Helpers ─── */
const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const pct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;

const PLAN_COLORS = ["#0ea5e9", "#06b6d4", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444"];

/* ─── Component ─── */
const MatrizDashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [storesRes, paymentsRes, profilesRes] = await Promise.all([
        supabase.from("stores").select("*, subscription_plans(name, price_monthly, slug)"),
        supabase.from("payment_history").select("*, subscription_plans(name, price_monthly)").order("payment_date", { ascending: false }),
        supabase.from("profiles").select("id"),
      ]);
      setData({
        stores: (storesRes.data as any) || [],
        payments: (paymentsRes.data as any) || [],
        profileCount: profilesRes.data?.length || 0,
      });
    } catch (e) {
      console.error("Error loading dashboard:", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) return null;

  // Exclude LIM PISCINAS (free full-access account) from all metrics
  const LIM_PISCINAS_ID = "5e8165c0-64b6-4d06-b274-8eeb261a79c4";
  const stores = data.stores.filter((s) => s.id !== LIM_PISCINAS_ID);
  const payments = data.payments.filter((p) => p.store_id !== LIM_PISCINAS_ID);

  /* ───────── Computed metrics ───────── */
  const activeStores = stores.filter((s) => s.plan_status === "active");
  const payingStores = activeStores.filter((s) => s.subscription_plans && s.subscription_plans.price_monthly > 0);

  // MRR
  const mrr = payingStores.reduce((sum, s) => sum + (s.subscription_plans?.price_monthly || 0), 0);

  // Previous month MRR estimate from payments
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const lastMonthPayments = payments.filter((p) => {
    if (!p.payment_date) return false;
    const d = new Date(p.payment_date);
    return d >= lastMonthStart && d <= lastMonthEnd && p.status === "paid";
  });
  const lastMonthRevenue = lastMonthPayments.reduce((s, p) => s + p.amount, 0);
  const mrrGrowth = lastMonthRevenue > 0 ? ((mrr - lastMonthRevenue) / lastMonthRevenue) * 100 : mrr > 0 ? 100 : 0;

  // Churn
  const cancelledStores = stores.filter((s) => s.plan_status === "cancelled" || s.plan_status === "expired");
  const totalWithHistory = stores.filter((s) => s.plan_started_at).length;
  const churnRate = totalWithHistory > 0 ? (cancelledStores.length / totalWithHistory) * 100 : 0;

  // Revenue lost (cancelled stores * their plan price)
  const revenueLost = cancelledStores.reduce((s, st) => s + (st.subscription_plans?.price_monthly || 0), 0);

  // ARPU
  const arpu = payingStores.length > 0 ? mrr / payingStores.length : 0;

  // Revenue breakdown
  const revenueRecurring = mrr;
  const thisMonthExcessPayments = payments.filter((p) => {
    if (!p.payment_date) return false;
    const d = new Date(p.payment_date);
    return d >= thisMonthStart && p.status === "paid";
  });
  const revenueExcess = thisMonthExcessPayments.reduce((s, p) => s + p.amount, 0) - mrr;
  const revenueExcessClean = Math.max(revenueExcess, 0);
  const revenueTotal = revenueRecurring + revenueExcessClean;
  const pctRecurring = revenueTotal > 0 ? (revenueRecurring / revenueTotal) * 100 : 0;
  const pctExcess = revenueTotal > 0 ? (revenueExcessClean / revenueTotal) * 100 : 0;

  // Plan distribution
  const planDist: Record<string, { count: number; revenue: number }> = {};
  stores.forEach((s) => {
    const name = s.subscription_plans?.name || "Gratuito";
    if (!planDist[name]) planDist[name] = { count: 0, revenue: 0 };
    planDist[name].count++;
    planDist[name].revenue += s.subscription_plans?.price_monthly || 0;
  });
  const planDistArr = Object.entries(planDist).map(([name, d]) => ({
    name,
    count: d.count,
    revenue: d.revenue,
    pctRevenue: mrr > 0 ? (d.revenue / mrr) * 100 : 0,
    ticket: d.count > 0 ? d.revenue / d.count : 0,
  }));

  // Projections (MRR-based with growth and churn)
  const growthRate = mrrGrowth / 100;
  const churnRateDecimal = churnRate / 100;
  const projectMRR = (months: number) => {
    let projected = mrr;
    for (let i = 0; i < months; i++) {
      projected = projected + projected * growthRate - projected * churnRateDecimal;
    }
    return projected;
  };

  const projections = [
    { label: "30 dias", months: 1 },
    { label: "60 dias", months: 2 },
    { label: "90 dias", months: 3 },
    { label: "6 meses", months: 6 },
    { label: "1 ano", months: 12 },
  ].map((p) => ({ ...p, value: projectMRR(p.months) }));

  // MRR evolution chart (last 6 months from payments)
  const mrrChartData: { month: string; mrr: number; total: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
    const monthPayments = payments.filter((p) => {
      if (!p.payment_date) return false;
      const pd = new Date(p.payment_date);
      return pd >= d && pd <= mEnd && p.status === "paid";
    });
    const totalMonth = monthPayments.reduce((s, p) => s + p.amount, 0);
    mrrChartData.push({ month: label, mrr: totalMonth, total: totalMonth });
  }
  // Current month = MRR
  if (mrrChartData.length > 0) {
    mrrChartData[mrrChartData.length - 1].mrr = mrr;
    mrrChartData[mrrChartData.length - 1].total = revenueTotal;
  }

  // LTV & retention
  const avgRetentionMonths = churnRate > 0 ? 1 / (churnRate / 100) : 24; // cap at 24 if no churn
  const ltv = arpu * Math.min(avgRetentionMonths, 120);

  // Risk alerts
  const risks: { level: "high" | "medium" | "low"; message: string; icon: typeof AlertTriangle }[] = [];
  if (churnRate > 10) risks.push({ level: "high", message: `Churn alto: ${churnRate.toFixed(1)}% — risco de perda significativa de receita`, icon: ShieldAlert });
  if (mrrGrowth < 0) risks.push({ level: "high", message: `MRR em queda: ${pct(mrrGrowth)} vs mês anterior`, icon: TrendingDown });
  const freeStores = stores.filter((s) => !s.subscription_plans || s.subscription_plans.price_monthly === 0);
  if (freeStores.length > payingStores.length) risks.push({ level: "medium", message: `${freeStores.length} lojas no plano gratuito (${((freeStores.length / Math.max(stores.length, 1)) * 100).toFixed(0)}% da base)`, icon: AlertTriangle });
  // Concentration risk
  if (payingStores.length > 0 && payingStores.length <= 3 && mrr > 0) risks.push({ level: "medium", message: `Receita concentrada em apenas ${payingStores.length} cliente(s) pagante(s)`, icon: AlertTriangle });

  // Pie chart data
  const pieData = planDistArr.filter((p) => p.revenue > 0).map((p, i) => ({
    name: p.name,
    value: p.revenue,
    color: PLAN_COLORS[i % PLAN_COLORS.length],
  }));

  /* ───────── RENDER ───────── */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold">Dashboard Financeira</h1>
        <p className="text-sm text-muted-foreground">Gestão de receita recorrente, previsibilidade e risco</p>
      </div>

      {/* ── 1. KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KPICard icon={DollarSign} label="MRR" value={fmt(mrr)} iconBg="bg-emerald-500/10" iconColor="text-emerald-600" />
        <KPICard
          icon={mrrGrowth >= 0 ? TrendingUp : TrendingDown}
          label="Crescimento MRR"
          value={pct(mrrGrowth)}
          iconBg={mrrGrowth >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"}
          iconColor={mrrGrowth >= 0 ? "text-emerald-600" : "text-red-500"}
          valueColor={mrrGrowth >= 0 ? "text-emerald-600" : "text-red-500"}
        />
        <KPICard
          icon={Users}
          label="Churn"
          value={`${churnRate.toFixed(1)}%`}
          iconBg={churnRate > 5 ? "bg-red-500/10" : "bg-emerald-500/10"}
          iconColor={churnRate > 5 ? "text-red-500" : "text-emerald-600"}
          valueColor={churnRate > 5 ? "text-red-500" : undefined}
        />
        <KPICard
          icon={TrendingDown}
          label="Receita Perdida"
          value={fmt(revenueLost)}
          iconBg="bg-red-500/10"
          iconColor="text-red-500"
          valueColor={revenueLost > 0 ? "text-red-500" : undefined}
        />
        <KPICard icon={Target} label="ARPU" value={fmt(arpu)} iconBg="bg-blue-500/10" iconColor="text-blue-600" />
      </div>

      {/* ── 2. Revenue Breakdown + Plan Pie ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">💰 Composição da Receita</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <RevenueBar label="Recorrente (Planos)" value={revenueRecurring} pct={pctRecurring} color="bg-emerald-500" />
            <RevenueBar label="Excedente (Uso)" value={revenueExcessClean} pct={pctExcess} color="bg-amber-500" />
            <div className="flex justify-between items-center pt-2 border-t border-border/50">
              <span className="font-semibold text-sm">Receita Total</span>
              <span className="font-bold text-lg">{fmt(revenueTotal)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Pie chart */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">📊 Receita por Plano</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(v: number) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma receita por plano ainda</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── 3. Projections ── */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">📈 Projeção de Faturamento</CardTitle>
          <p className="text-xs text-muted-foreground">
            Base: MRR {fmt(mrr)} · Crescimento: {mrrGrowth.toFixed(1)}% · Churn: {churnRate.toFixed(1)}%
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {projections.map((p) => {
              const isGrowth = p.value >= mrr;
              return (
                <div key={p.label} className="text-center p-3 rounded-lg bg-muted/50 border border-border/30">
                  <p className="text-xs text-muted-foreground mb-1">{p.label}</p>
                  <p className={`text-lg font-bold ${isGrowth ? "text-emerald-600" : "text-red-500"}`}>{fmt(p.value)}</p>
                  <p className={`text-[10px] font-medium ${isGrowth ? "text-emerald-600" : "text-red-500"}`}>
                    {pct(((p.value - mrr) / Math.max(mrr, 1)) * 100)}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── 4. MRR Evolution Chart ── */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">📉 Evolução da Receita (6 meses)</CardTitle>
        </CardHeader>
        <CardContent>
          {mrrChartData.some((d) => d.mrr > 0 || d.total > 0) ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={mrrChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} className="text-xs" tick={{ fontSize: 11 }} />
                <RechartsTooltip formatter={(v: number) => fmt(v)} />
                <Line type="monotone" dataKey="mrr" name="MRR" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="total" name="Receita Total" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 4 }} strokeDasharray="5 5" />
                <Legend />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Dados insuficientes para o gráfico</p>
          )}
        </CardContent>
      </Card>

      {/* ── 5. Plan Distribution Table ── */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">🏷️ Distribuição por Plano</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-left">
                  <th className="pb-2 font-medium text-muted-foreground">Plano</th>
                  <th className="pb-2 font-medium text-muted-foreground text-center">Clientes</th>
                  <th className="pb-2 font-medium text-muted-foreground text-right">Receita/mês</th>
                  <th className="pb-2 font-medium text-muted-foreground text-right">% Faturamento</th>
                  <th className="pb-2 font-medium text-muted-foreground text-right">Ticket Médio</th>
                </tr>
              </thead>
              <tbody>
                {planDistArr.map((plan, i) => (
                  <tr key={plan.name} className="border-b border-border/20">
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: PLAN_COLORS[i % PLAN_COLORS.length] }} />
                        <span className="font-medium">{plan.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 text-center">{plan.count}</td>
                    <td className="py-2.5 text-right font-semibold">{fmt(plan.revenue)}</td>
                    <td className="py-2.5 text-right">{plan.pctRevenue.toFixed(1)}%</td>
                    <td className="py-2.5 text-right">{fmt(plan.ticket)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── 6. Advanced Metrics ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-violet-500" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">LTV</p>
            </div>
            <p className="text-2xl font-bold">{fmt(ltv)}</p>
            <p className="text-[11px] text-muted-foreground">Lifetime Value estimado</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-cyan-500" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Retenção Média</p>
            </div>
            <p className="text-2xl font-bold">{Math.min(avgRetentionMonths, 24).toFixed(1)} meses</p>
            <p className="text-[11px] text-muted-foreground">Tempo médio de permanência</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Users className="w-4 h-4 text-primary" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Clientes Ativos</p>
            </div>
            <p className="text-2xl font-bold">{payingStores.length}</p>
            <p className="text-[11px] text-muted-foreground">de {stores.length} cadastrados</p>
          </CardContent>
        </Card>
      </div>

      {/* ── 7. Risk Alerts ── */}
      {risks.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">🚨 Alertas de Risco</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {risks.map((r, i) => {
              const colors = {
                high: "bg-red-500/10 border-red-500/30 text-red-700",
                medium: "bg-amber-500/10 border-amber-500/30 text-amber-700",
                low: "bg-blue-500/10 border-blue-500/30 text-blue-700",
              };
              const badgeColors = {
                high: "destructive" as const,
                medium: "secondary" as const,
                low: "outline" as const,
              };
              const Icon = r.icon;
              return (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${colors[r.level]}`}>
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="text-sm flex-1">{r.message}</span>
                  <Badge variant={badgeColors[r.level]} className="shrink-0 text-[10px]">
                    {r.level === "high" ? "CRÍTICO" : r.level === "medium" ? "ATENÇÃO" : "INFO"}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {risks.length === 0 && (
        <Card className="border-border/50 border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-sm text-emerald-700">Tudo certo!</p>
              <p className="text-xs text-muted-foreground">Nenhum alerta de risco identificado no momento.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

/* ─── Sub-components ─── */

function KPICard({ icon: Icon, label, value, iconBg, iconColor, valueColor }: {
  icon: any; label: string; value: string; iconBg: string; iconColor: string; valueColor?: string;
}) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground uppercase tracking-wider leading-tight">{label}</p>
            <p className={`text-lg sm:text-2xl font-bold mt-1 truncate ${valueColor || ""}`}>{value}</p>
          </div>
          <div className={`hidden sm:flex h-9 w-9 rounded-lg ${iconBg} items-center justify-center shrink-0`}>
            <Icon className={`h-4 w-4 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RevenueBar({ label, value, pct: pctVal, color }: { label: string; value: number; pct: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{fmt(value)} <span className="text-xs text-muted-foreground">({pctVal.toFixed(0)}%)</span></span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${Math.max(pctVal, 1)}%` }} />
      </div>
    </div>
  );
}

export default MatrizDashboard;
