import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface StoreRow {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  plan_status: string | null;
  plan_started_at: string | null;
  created_at: string | null;
  subscription_plans: { name: string; price_monthly: number; slug: string } | null;
}

const MatrizStores = () => {
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    const { data } = await supabase
      .from("stores")
      .select("*, subscription_plans(name, price_monthly, slug)")
      .order("created_at", { ascending: false });

    setStores((data as any) || []);
    setLoading(false);
  };

  const filtered = stores.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.city || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.state || "").toLowerCase().includes(search.toLowerCase());
    const matchPlan = planFilter === "all" || (s.subscription_plans?.slug || "gratuito") === planFilter;
    return matchSearch && matchPlan;
  });

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("pt-BR") : "-";

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const statusBadge = (status: string | null) => {
    if (status === "active") return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Ativo</Badge>;
    if (status === "overdue") return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Inadimplente</Badge>;
    if (status === "canceled") return <Badge className="bg-gray-500/10 text-gray-600 border-gray-500/20">Cancelado</Badge>;
    return <Badge variant="outline">Sem plano</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Lojas Cadastradas</h1>
        <p className="text-muted-foreground">{stores.length} lojas no total</p>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, cidade ou estado..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar plano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Planos</SelectItem>
            <SelectItem value="gratuito">Gratuito</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
            <SelectItem value="avancado">Avançado</SelectItem>
            <SelectItem value="escala">Escala</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filtered.map((store) => (
          <Card key={store.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold">{store.name}</h3>
                  {statusBadge(store.plan_status)}
                </div>
                <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                  {store.city && <span>{store.city}/{store.state}</span>}
                  <span>Cadastro: {formatDate(store.created_at)}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-primary">
                  {formatCurrency(store.subscription_plans?.price_monthly || 0)}/mês
                </p>
                <p className="text-xs text-muted-foreground">
                  {store.subscription_plans?.name || "Gratuito"}
                </p>
              </div>
            </div>
          </Card>
        ))}

        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-8">Nenhuma loja encontrada.</p>
        )}
      </div>
    </div>
  );
};

export default MatrizStores;
