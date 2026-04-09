import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Store, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import BrazilMap from "./BrazilMap";

const LIM_ID = "5e8165c0-64b6-4d06-b274-8eeb261a79c4";

interface StoreRow {
  id: string; name: string; city: string | null; state: string | null;
  plan_status: string | null; created_at: string | null;
  subscription_plans: { name: string; slug: string } | null;
}

const MatrizMapPage = () => {
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterState, setFilterState] = useState("all");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("stores")
        .select("id, name, city, state, plan_status, created_at, subscription_plans(name, slug)")
        .order("created_at", { ascending: false });
      setStores(((data as any) || []).filter((s: StoreRow) => s.id !== LIM_ID));
      setLoading(false);
    };
    load();
  }, []);

  const stateMap = useMemo(() => {
    const m = new Map<string, number>();
    stores.forEach(s => { if (s.state) m.set(s.state, (m.get(s.state) || 0) + 1); });
    return m;
  }, [stores]);

  const states = useMemo(() => [...new Set(stores.map(s => s.state).filter(Boolean))].sort() as string[], [stores]);

  const topStates = useMemo(() => {
    return [...stateMap.entries()].sort((a, b) => b[1] - a[1]).map(([state, count]) => ({ state, count }));
  }, [stateMap]);

  const maxCount = topStates[0]?.count || 1;

  const filteredStores = useMemo(() => {
    let result = stores;
    if (filterState !== "all") result = result.filter(s => s.state === filterState);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s => s.name.toLowerCase().includes(q) || (s.city || "").toLowerCase().includes(q));
    }
    return result;
  }, [stores, filterState, search]);

  const statusBadge = (status: string | null) => {
    if (status === "active") return <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">Ativo</span>;
    if (status === "past_due") return <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">Inadimplente</span>;
    if (status === "trial") return <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">Trial</span>;
    return <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{status || "—"}</span>;
  };

  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-8">
        <Skeleton className="h-8 w-64 rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-[500px] rounded-xl" />
          <Skeleton className="h-[500px] rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-8">
      {/* Header */}
      <div>
        <h1 className="text-[18px] font-semibold text-foreground">Mapa de Lojistas</h1>
        <p className="text-[13px] text-muted-foreground">Distribuição geográfica de {stores.length} lojistas cadastrados</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <span className="text-[11px] font-semibold uppercase text-muted-foreground">TOTAL LOJISTAS</span>
          <div className="text-[22px] font-bold text-foreground mt-1">{stores.length}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <span className="text-[11px] font-semibold uppercase text-muted-foreground">ESTADOS COBERTOS</span>
          <div className="text-[22px] font-bold text-foreground mt-1">{stateMap.size}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <span className="text-[11px] font-semibold uppercase text-muted-foreground">CIDADES COBERTAS</span>
          <div className="text-[22px] font-bold text-foreground mt-1">{new Set(stores.map(s => s.city).filter(Boolean)).size}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <span className="text-[11px] font-semibold uppercase text-muted-foreground">ATIVOS</span>
          <div className="text-[22px] font-bold text-foreground mt-1">{stores.filter(s => s.plan_status === "active").length}</div>
        </div>
      </div>

      {/* Map + ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">DISTRIBUIÇÃO GEOGRÁFICA</span>
          <h3 className="text-[15px] font-semibold text-foreground mt-1 mb-4">Lojistas por estado</h3>
          <BrazilMap stateData={Object.fromEntries(stateMap)} stores={stores.map(s => ({ id: s.id, name: s.name, city: s.city, state: s.state }))} />
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h4 className="text-[13px] font-semibold text-foreground mb-4">Ranking por Estado</h4>
          <div className="space-y-3">
            {topStates.map((ts, i) => (
              <div key={ts.state}>
                <div className="flex justify-between text-[14px] mb-1">
                  <span className="font-medium text-foreground flex items-center gap-2">
                    {i < 3 && <span>{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</span>}
                    {ts.state}
                  </span>
                  <span className="font-semibold text-primary">{ts.count}</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(ts.count / maxCount) * 100}%` }} />
                </div>
              </div>
            ))}
            {topStates.length === 0 && <p className="text-[13px] text-muted-foreground">Nenhum dado</p>}
          </div>
        </div>
      </div>

      {/* Store list */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">LISTA COMPLETA</span>
            <h3 className="text-[15px] font-semibold text-foreground mt-1">Lojistas por localização</h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar loja ou cidade..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-[13px] w-[220px] rounded-lg" />
            </div>
            <Select value={filterState} onValueChange={setFilterState}>
              <SelectTrigger className="w-[140px] h-9 text-[13px] rounded-lg">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted">
                {["Loja", "Cidade", "Estado", "Plano", "Status"].map(h => (
                  <th key={h} className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground px-4 py-3 text-left first:rounded-tl-lg last:rounded-tr-lg">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredStores.map(s => (
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
                  <td className="px-4">{statusBadge(s.plan_status)}</td>
                </tr>
              ))}
              {filteredStores.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-[13px] text-muted-foreground">
                  <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Nenhum lojista encontrado
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="text-[12px] text-muted-foreground mt-3">{filteredStores.length} de {stores.length} lojistas</div>
      </div>
    </div>
  );
};

export default MatrizMapPage;
