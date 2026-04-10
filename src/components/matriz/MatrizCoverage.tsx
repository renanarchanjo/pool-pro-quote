import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Search, Pencil, MapPin, History, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface StoreRadius {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  coverage_radius_km: number;
  coverage_radius_active: boolean;
}

interface AuditEntry {
  id: string;
  old_radius_km: number | null;
  new_radius_km: number | null;
  old_active: boolean | null;
  new_active: boolean | null;
  reason: string | null;
  created_at: string;
}

const MatrizCoverage = () => {
  const [stores, setStores] = useState<StoreRadius[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Edit modal
  const [editStore, setEditStore] = useState<StoreRadius | null>(null);
  const [radiusKm, setRadiusKm] = useState(50);
  const [radiusActive, setRadiusActive] = useState(true);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  // History modal
  const [historyStore, setHistoryStore] = useState<StoreRadius | null>(null);
  const [history, setHistory] = useState<AuditEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => { loadStores(); }, []);

  const loadStores = async () => {
    const { data } = await supabase
      .from("stores")
      .select("id, name, city, state, latitude, longitude, coverage_radius_km, coverage_radius_active")
      .order("name");
    setStores((data as any) || []);
    setLoading(false);
  };

  const openEdit = (store: StoreRadius) => {
    setEditStore(store);
    setRadiusKm(store.coverage_radius_km);
    setRadiusActive(store.coverage_radius_active);
    setReason("");
  };

  const handleSave = async () => {
    if (!editStore) return;
    if (radiusKm < 1 || radiusKm > 5000) {
      toast.error("O raio deve ser entre 1 e 5000 km");
      return;
    }
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      // Update store
      const { error } = await supabase
        .from("stores")
        .update({
          coverage_radius_km: radiusKm,
          coverage_radius_active: radiusActive,
        } as any)
        .eq("id", editStore.id);
      if (error) throw error;

      // Insert audit log
      await supabase.from("store_radius_audit_log" as any).insert({
        store_id: editStore.id,
        changed_by: session.user.id,
        old_radius_km: editStore.coverage_radius_km,
        new_radius_km: radiusKm,
        old_active: editStore.coverage_radius_active,
        new_active: radiusActive,
        reason: reason.trim() || null,
      });

      toast.success("Raio atualizado com sucesso!");
      setEditStore(null);
      loadStores();
    } catch (err: any) {
      toast.error("Erro ao salvar: " + (err.message || "Tente novamente"));
    } finally {
      setSaving(false);
    }
  };

  const openHistory = async (store: StoreRadius) => {
    setHistoryStore(store);
    setLoadingHistory(true);
    const { data } = await supabase
      .from("store_radius_audit_log" as any)
      .select("id, old_radius_km, new_radius_km, old_active, new_active, reason, created_at")
      .eq("store_id", store.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setHistory((data as any) || []);
    setLoadingHistory(false);
  };

  const filtered = stores.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.city || "").toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const getRadiusBadge = (store: StoreRadius) => {
    if (!store.coverage_radius_active)
      return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">Teste</Badge>;
    if (store.coverage_radius_km > 200)
      return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20 text-[10px]">Amplo</Badge>;
    return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">Normal</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-8">
        <Skeleton className="h-8 w-64 rounded-lg" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-3 md:p-8">
      <div>
        <h1 className="text-[18px] font-semibold text-foreground">Cobertura de Lojas</h1>
        <p className="text-[13px] text-muted-foreground">Configure o raio de atendimento de cada loja</p>
      </div>

      {/* Alert for stores without coordinates */}
      {stores.some(s => !s.latitude || !s.longitude) && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-700">Lojas sem coordenadas</p>
            <p className="text-xs text-amber-600 mt-0.5">
              {stores.filter(s => !s.latitude || !s.longitude).length} loja(s) sem latitude/longitude. Com o filtro ativo, elas não aparecerão para nenhum cliente.
            </p>
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar loja..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
      </div>

      <div className="space-y-2">
        {filtered.map((store) => (
          <Card key={store.id} className="border-border overflow-hidden">
            <div className="flex items-center justify-between p-3 md:p-4 gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                  <h3 className="font-semibold text-sm truncate">{store.name}</h3>
                  {getRadiusBadge(store)}
                  {(!store.latitude || !store.longitude) && (
                    <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive">Sem coordenadas</Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-3 mt-1 text-xs text-muted-foreground">
                  {store.city && <span>{store.city}/{store.state}</span>}
                  <span className="font-medium">{store.coverage_radius_km} km</span>
                  <span>{store.coverage_radius_active ? "Filtro ativo" : "Filtro desativado"}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(store)} title="Editar raio">
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openHistory(store)} title="Ver histórico">
                  <History className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-8">Nenhuma loja encontrada.</p>
        )}
      </div>

      {/* Edit Modal */}
      <Dialog open={!!editStore} onOpenChange={(open) => !open && setEditStore(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Raio de Atendimento</DialogTitle>
            <DialogDescription>{editStore?.name} — {editStore?.city}/{editStore?.state}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Raio de atendimento (km)</Label>
              <Input
                type="number"
                min={1}
                max={5000}
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
              />
              <p className="text-[11px] text-muted-foreground">Aceita valores de 1 a 5000 km</p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Filtro de raio ativo</Label>
                <p className="text-[11px] text-muted-foreground">Desativado = loja aparece para todos (modo teste)</p>
              </div>
              <Switch checked={radiusActive} onCheckedChange={setRadiusActive} />
            </div>
            <div className="space-y-1.5">
              <Label>Motivo da alteração (opcional)</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex: Teste com colaboradores de outra cidade"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditStore(null)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Modal */}
      <Dialog open={!!historyStore} onOpenChange={(open) => !open && setHistoryStore(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico de Alterações</DialogTitle>
            <DialogDescription>{historyStore?.name}</DialogDescription>
          </DialogHeader>
          {loadingHistory ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma alteração registrada.</p>
          ) : (
            <div className="space-y-3">
              {history.map((entry) => (
                <div key={entry.id} className="border border-border rounded-lg p-3 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">{formatDate(entry.created_at)}</span>
                  </div>
                  <div className="space-y-0.5 text-xs">
                    {entry.old_radius_km !== entry.new_radius_km && (
                      <p>Raio: <span className="text-muted-foreground">{entry.old_radius_km}km</span> → <span className="font-medium">{entry.new_radius_km}km</span></p>
                    )}
                    {entry.old_active !== entry.new_active && (
                      <p>Filtro: <span className="text-muted-foreground">{entry.old_active ? "ativo" : "inativo"}</span> → <span className="font-medium">{entry.new_active ? "ativo" : "inativo"}</span></p>
                    )}
                    {entry.reason && <p className="text-muted-foreground italic mt-1">"{entry.reason}"</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MatrizCoverage;
