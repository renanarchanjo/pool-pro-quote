import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useStoreData } from "@/hooks/useStoreData";

const AdminDashboard = () => {
  const { profile } = useStoreData();
  const [stats, setStats] = useState({ total: 0, enviadas: 0, aprovadas: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { count } = await supabase
        .from("proposals")
        .select("*", { count: "exact", head: true });

      setStats({
        total: count || 0,
        enviadas: count || 0,
        aprovadas: 0,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <p className="text-muted-foreground mb-2">
        Olá, <span className="font-bold text-foreground">{profile?.full_name || "Lojista"}</span>
      </p>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-1">Total de Propostas</p>
          <p className="text-3xl font-bold">{stats.total}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-1">Propostas Enviadas</p>
          <p className="text-3xl font-bold text-primary">{stats.enviadas}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-1">Propostas Aprovadas</p>
          <p className="text-3xl font-bold text-accent">{stats.aprovadas}</p>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
