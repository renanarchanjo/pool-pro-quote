import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, TrendingUp, Users, Clock, ArrowRight } from "lucide-react";
import { useStoreData } from "@/hooks/useStoreData";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface RecentProposal {
  id: string;
  customer_name: string;
  customer_city: string;
  customer_whatsapp: string;
  total_price: number;
  created_at: string;
  pool_models: { name: string } | null;
}

const AdminDashboard = () => {
  const { profile } = useStoreData();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, thisMonth: 0, thisWeek: 0, totalRevenue: 0 });
  const [recentProposals, setRecentProposals] = useState<RecentProposal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())).toISOString();

      const [totalRes, monthRes, weekRes, recentRes] = await Promise.all([
        supabase.from("proposals").select("total_price", { count: "exact" }),
        supabase.from("proposals").select("*", { count: "exact", head: true }).gte("created_at", startOfMonth),
        supabase.from("proposals").select("*", { count: "exact", head: true }).gte("created_at", startOfWeek),
        supabase.from("proposals").select(`
          id, customer_name, customer_city, customer_whatsapp, total_price, created_at,
          pool_models (name)
        `).order("created_at", { ascending: false }).limit(5),
      ]);

      const totalRevenue = (totalRes.data || []).reduce((sum, p) => sum + (p.total_price || 0), 0);

      setStats({
        total: totalRes.count || 0,
        thisMonth: monthRes.count || 0,
        thisWeek: weekRes.count || 0,
        totalRevenue,
      });
      setRecentProposals(recentRes.data || []);
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) =>
    `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}min atrás`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h atrás`;
    const days = Math.floor(hours / 24);
    return `${days}d atrás`;
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-muted-foreground mb-1">
          Olá, <span className="font-bold text-foreground">{profile?.full_name || "Lojista"}</span>
        </p>
        <h1 className="text-3xl font-bold">Dashboard</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Propostas</p>
                <p className="text-3xl font-bold mt-1">{stats.total}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Este Mês</p>
                <p className="text-3xl font-bold mt-1">{stats.thisMonth}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Esta Semana</p>
                <p className="text-3xl font-bold mt-1">{stats.thisWeek}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Receita Total</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalRevenue)}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Proposals / Lead Follow-up */}
      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold">Últimos Leads / Propostas</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/propostas")} className="text-primary">
            Ver todos <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {recentProposals.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhuma proposta gerada ainda</p>
          ) : (
            <div className="space-y-3">
              {recentProposals.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{p.customer_name}</p>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {p.pool_models?.name || "N/A"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {p.customer_city} · {p.customer_whatsapp}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="font-bold text-primary">{formatCurrency(p.total_price)}</p>
                    <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                      <Clock className="w-3 h-3" />
                      {timeAgo(p.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
