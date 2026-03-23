import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Loader2, Store, TrendingUp, DollarSign, Users } from "lucide-react";

interface DashboardData {
  totalStores: number;
  activeStores: number;
  totalProposals: number;
  monthlyRevenue: number;
  planDistribution: { name: string; count: number; revenue: number }[];
}

const MatrizDashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      // Fetch all stores with plans
      const { data: stores } = await supabase
        .from("stores")
        .select("*, subscription_plans(name, price_monthly, slug)");

      // Fetch all proposals
      const { data: proposals } = await supabase
        .from("proposals")
        .select("id, created_at, store_id");

      // Fetch all profiles to count users
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, store_id");

      const totalStores = stores?.length || 0;
      const activeStores = stores?.filter((s: any) => s.plan_status === "active").length || 0;

      // Calculate monthly revenue
      let monthlyRevenue = 0;
      const planDist: Record<string, { count: number; revenue: number }> = {};

      stores?.forEach((store: any) => {
        const planName = store.subscription_plans?.name || "Gratuito";
        const price = store.subscription_plans?.price_monthly || 0;
        monthlyRevenue += price;

        if (!planDist[planName]) {
          planDist[planName] = { count: 0, revenue: 0 };
        }
        planDist[planName].count++;
        planDist[planName].revenue += price;
      });

      const planDistribution = Object.entries(planDist).map(([name, d]) => ({
        name,
        count: d.count,
        revenue: d.revenue,
      }));

      setData({
        totalStores,
        activeStores,
        totalProposals: proposals?.length || 0,
        monthlyRevenue,
        planDistribution,
      });
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) return null;

  // Projections
  const proj30 = data.monthlyRevenue;
  const proj60 = data.monthlyRevenue * 2;
  const proj90 = data.monthlyRevenue * 3;
  const proj180 = data.monthlyRevenue * 6;
  const proj365 = data.monthlyRevenue * 12;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Dashboard Financeiro</h1>
        <p className="text-muted-foreground">Visão geral do ecossistema SIMULAPOOL</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Store className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Lojas Cadastradas</p>
              <p className="text-2xl font-bold">{data.totalStores}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Users className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Lojas Ativas</p>
              <p className="text-2xl font-bold">{data.activeStores}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10">
              <DollarSign className="w-5 h-5 text-cyan-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Faturamento Mensal</p>
              <p className="text-2xl font-bold">{formatCurrency(data.monthlyRevenue)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <TrendingUp className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de Propostas</p>
              <p className="text-2xl font-bold">{data.totalProposals}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Projections */}
      <Card className="p-6">
        <h2 className="text-lg font-display font-semibold mb-4">📈 Projeção de Faturamento</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "30 dias", value: proj30 },
            { label: "60 dias", value: proj60 },
            { label: "90 dias", value: proj90 },
            { label: "6 meses", value: proj180 },
            { label: "1 ano", value: proj365 },
          ].map((p) => (
            <div key={p.label} className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">{p.label}</p>
              <p className="text-lg font-bold text-primary">{formatCurrency(p.value)}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Plan Distribution */}
      <Card className="p-6">
        <h2 className="text-lg font-display font-semibold mb-4">📊 Distribuição por Plano</h2>
        <div className="space-y-3">
          {data.planDistribution.map((plan) => (
            <div key={plan.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <span className="font-medium">{plan.name}</span>
                <span className="text-sm text-muted-foreground">({plan.count} {plan.count === 1 ? 'loja' : 'lojas'})</span>
              </div>
              <span className="font-bold">{formatCurrency(plan.revenue)}/mês</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default MatrizDashboard;
