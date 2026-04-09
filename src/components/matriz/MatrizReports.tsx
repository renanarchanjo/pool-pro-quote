import { useEffect, useState, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileBarChart, TrendingUp, TrendingDown, Users, DollarSign,
  FileDown, Store, Activity,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { exportPDF } from "@/lib/exportPDF";

const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v ?? 0);
const pct = (v: number) => (v ?? 0).toFixed(1) + "%";
const MONTHS_PT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const LIM_ID = "5e8165c0-64b6-4d06-b274-8eeb261a79c4";

interface StoreRow {
  id: string; name: string; city: string | null; state: string | null;
  plan_status: string | null; created_at: string | null;
  subscription_plans: { name: string; price_monthly: number; slug: string } | null;
}

const MatrizReports = () => {
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState("overview");
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const [s, p, pay] = await Promise.all([
        supabase.from("stores").select("id, name, city, state, plan_status, created_at, subscription_plans(name, price_monthly, slug)"),
        supabase.from("proposals").select("id, store_id, total_price, created_at, status"),
        supabase.from("payment_history").select("id, store_id, amount, status, payment_date"),
      ]);
      setStores(((s.data as any) || []).filter((x: any) => x.id !== LIM_ID));
      setProposals((p.data || []).filter((x: any) => x.store_id !== LIM_ID));
      setPayments((pay.data || []).filter((x: any) => x.store_id !== LIM_ID));
      setLoading(false);
    };
    load();
  }, []);

  const metrics = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const activeStores = stores.filter(s => s.plan_status === "active");
    let mrr = 0;
    activeStores.forEach(s => { if (s.subscription_plans) mrr += s.subscription_plans.price_monthly; });

    const totalRevenue = proposals.filter(p => p.status === "fechada").reduce((a: number, p: any) => a + p.total_price, 0);
    const totalProposals = proposals.length;
    const closedProposals = proposals.filter(p => p.status === "fechada").length;
    const conversionRate = totalProposals > 0 ? (closedProposals / totalProposals) * 100 : 0;
    const avgTicket = closedProposals > 0 ? totalRevenue / closedProposals : 0;

    // Monthly revenue
    const monthlyRevenue: { month: string; revenue: number; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(thisYear, thisMonth - i, 1);
      const label = MONTHS_PT[d.getMonth()] + "/" + String(d.getFullYear()).slice(2);
      const monthProposals = proposals.filter(p => {
        if (!p.created_at || p.status !== "fechada") return false;
        const pd = new Date(p.created_at);
        return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
      });
      monthlyRevenue.push({
        month: label,
        revenue: monthProposals.reduce((a: number, p: any) => a + p.total_price, 0),
        count: monthProposals.length,
      });
    }

    // Status distribution
    const statusDist = [
      { name: "Nova", value: proposals.filter(p => p.status === "nova").length, color: "hsl(var(--primary))" },
      { name: "Enviada", value: proposals.filter(p => p.status === "enviada").length, color: "#7DD3FC" },
      { name: "Negociação", value: proposals.filter(p => p.status === "em_negociacao").length, color: "#FBBF24" },
      { name: "Fechada", value: proposals.filter(p => p.status === "fechada").length, color: "#22C55E" },
      { name: "Perdida", value: proposals.filter(p => p.status === "perdida").length, color: "#EF4444" },
    ];

    // Top stores
    const storeRevMap = new Map<string, number>();
    const storeCountMap = new Map<string, number>();
    proposals.filter(p => p.status === "fechada").forEach(p => {
      if (p.store_id) {
        storeRevMap.set(p.store_id, (storeRevMap.get(p.store_id) || 0) + p.total_price);
        storeCountMap.set(p.store_id, (storeCountMap.get(p.store_id) || 0) + 1);
      }
    });
    const topStores = stores
      .map(s => ({ ...s, revenue: storeRevMap.get(s.id) || 0, closedCount: storeCountMap.get(s.id) || 0 }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Plan distribution
    const planDist = new Map<string, number>();
    stores.forEach(s => {
      const plan = s.subscription_plans?.name || "Sem plano";
      planDist.set(plan, (planDist.get(plan) || 0) + 1);
    });
    const planData = [...planDist.entries()].map(([name, value]) => ({ name, value }));

    // Monthly proposals
    const monthlyProposals: { month: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(thisYear, thisMonth - i, 1);
      const label = MONTHS_PT[d.getMonth()] + "/" + String(d.getFullYear()).slice(2);
      const count = proposals.filter(p => {
        if (!p.created_at) return false;
        const pd = new Date(p.created_at);
        return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
      }).length;
      monthlyProposals.push({ month: label, count });
    }

    // Payments
    const paidTotal = payments.filter(p => p.status === "paid").reduce((a: number, p: any) => a + p.amount, 0);
    const pendingTotal = payments.filter(p => p.status === "pending").reduce((a: number, p: any) => a + p.amount, 0);

    return {
      mrr, totalRevenue, totalProposals, closedProposals, conversionRate, avgTicket,
      monthlyRevenue, statusDist, topStores, planData, monthlyProposals,
      activeCount: activeStores.length, storeCount: stores.length,
      paidTotal, pendingTotal,
    };
  }, [stores, proposals, payments]);

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    await exportPDF({ element: reportRef.current, filename: `relatorio-matriz-${new Date().toISOString().slice(0, 10)}` });
  };

  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-8">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[100px] rounded-xl" />)}
        </div>
        <Skeleton className="h-[300px] rounded-xl" />
      </div>
    );
  }

  const PLAN_COLORS = ["hsl(var(--primary))", "#22C55E", "#A855F7", "#F59E0B", "#6B7280"];

  return (
    <div className="space-y-6 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-[18px] font-semibold text-foreground">Relatórios</h1>
          <p className="text-[13px] text-muted-foreground">Análise completa da plataforma SimulaPool</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-[180px] h-9 text-[13px] rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">Visão Geral</SelectItem>
              <SelectItem value="revenue">Faturamento</SelectItem>
              <SelectItem value="stores">Lojistas</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-9 text-[13px] rounded-lg gap-2" onClick={handleExportPDF}>
            <FileDown className="w-4 h-4" /> Exportar PDF
          </Button>
        </div>
      </div>

      <div ref={reportRef} className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MiniKPI icon={Store} label="Lojas Cadastradas" value={String(metrics.storeCount)} />
          <MiniKPI icon={Users} label="Lojistas Ativos" value={String(metrics.activeCount)} />
          <MiniKPI icon={DollarSign} label="MRR" value={fmt(metrics.mrr)} />
          <MiniKPI icon={Activity} label="Total Simulações" value={String(metrics.totalProposals)} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MiniKPI icon={DollarSign} label="Fat. Bruto Lojistas" value={fmt(metrics.totalRevenue)} />
          <MiniKPI icon={TrendingUp} label="Taxa Conversão" value={pct(metrics.conversionRate)} />
          <MiniKPI icon={DollarSign} label="Ticket Médio" value={fmt(metrics.avgTicket)} />
          <MiniKPI icon={DollarSign} label="Recebido (Stripe)" value={fmt(metrics.paidTotal)} />
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">FATURAMENTO MENSAL</span>
            <h3 className="text-[15px] font-semibold text-foreground mt-1 mb-4">Receita dos lojistas (fechadas)</h3>
            {metrics.monthlyRevenue.every(m => m.revenue === 0) ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={metrics.monthlyRevenue}>
                  <defs>
                    <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.08} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12, background: "hsl(var(--card))", color: "hsl(var(--foreground))" }} formatter={(v: number) => fmt(v)} />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#revFill)" name="Receita" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">VOLUME</span>
            <h3 className="text-[15px] font-semibold text-foreground mt-1 mb-4">Simulações por mês</h3>
            {metrics.monthlyProposals.every(m => m.count === 0) ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={metrics.monthlyProposals}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12, background: "hsl(var(--card))", color: "hsl(var(--foreground))" }} />
                  <Bar dataKey="count" name="Simulações" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Charts row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">FUNIL DE VENDAS</span>
            <h3 className="text-[15px] font-semibold text-foreground mt-1 mb-4">Distribuição por status</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={metrics.statusDist.filter(d => d.value > 0)} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" paddingAngle={2}>
                  {metrics.statusDist.filter(d => d.value > 0).map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12, background: "hsl(var(--card))", color: "hsl(var(--foreground))" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-4 justify-center text-[12px] text-foreground">
              {metrics.statusDist.filter(d => d.value > 0).map(d => (
                <div key={d.name} className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: d.color }} />{d.name} ({d.value})</div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">PLANOS</span>
            <h3 className="text-[15px] font-semibold text-foreground mt-1 mb-4">Distribuição por plano</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={metrics.planData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" paddingAngle={2}>
                  {metrics.planData.map((_, i) => (
                    <Cell key={i} fill={PLAN_COLORS[i % PLAN_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12, background: "hsl(var(--card))", color: "hsl(var(--foreground))" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-4 justify-center text-[12px] text-foreground">
              {metrics.planData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: PLAN_COLORS[i % PLAN_COLORS.length] }} />{d.name} ({d.value})</div>
              ))}
            </div>
          </div>
        </div>

        {/* Top stores table */}
        <div className="bg-card border border-border rounded-xl p-6">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">PERFORMANCE</span>
          <h3 className="text-[15px] font-semibold text-foreground mt-1 mb-4">Top 10 Lojistas por Faturamento</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted">
                  {["#", "Loja", "Cidade/Estado", "Plano", "Vendas", "Faturamento"].map(h => (
                    <th key={h} className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground px-4 py-3 text-left first:rounded-tl-lg last:rounded-tr-lg">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metrics.topStores.map((s, i) => (
                  <tr key={s.id} className="border-b border-border hover:bg-muted/50 h-[48px]">
                    <td className="px-4 text-[14px] text-foreground">{i < 3 ? ["🥇","🥈","🥉"][i] : i + 1}</td>
                    <td className="px-4 text-[14px] font-medium text-foreground">{s.name}</td>
                    <td className="px-4 text-[13px] text-muted-foreground">{s.city || "—"} / {s.state || "—"}</td>
                    <td className="px-4 text-[13px] text-muted-foreground">{s.subscription_plans?.name || "—"}</td>
                    <td className="px-4 text-[14px] text-foreground">{s.closedCount}</td>
                    <td className="px-4 text-[14px] font-semibold text-foreground">{fmt(s.revenue)}</td>
                  </tr>
                ))}
                {metrics.topStores.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-8 text-[13px] text-muted-foreground">Nenhum dado</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

function MiniKPI({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
        </div>
        <span className="text-[11px] font-semibold uppercase text-muted-foreground">{label}</span>
      </div>
      <div className="text-[20px] font-bold text-foreground">{value}</div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex flex-col items-center justify-center h-[260px] text-muted-foreground">
      <FileBarChart className="w-10 h-10 mb-2 opacity-30" />
      <span className="text-[13px]">Nenhum dado ainda</span>
    </div>
  );
}

export default MatrizReports;
