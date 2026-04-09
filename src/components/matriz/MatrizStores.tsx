import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Search, Pencil, Trash2, Save, X, Store, Radio } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface StoreRow {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  cnpj: string | null;
  razao_social: string | null;
  nome_fantasia: string | null;
  whatsapp: string | null;
  plan_status: string | null;
  plan_started_at: string | null;
  created_at: string | null;
  lead_plan_active: boolean | null;
  subscription_plans: { name: string; price_monthly: number; slug: string } | null;
}

interface EditForm {
  name: string;
  slug: string;
  city: string;
  state: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  whatsapp: string;
  plan_status: string;
}

const MatrizStores = () => {
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");

  // Edit state
  const [editingStore, setEditingStore] = useState<StoreRow | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ name: "", slug: "", city: "", state: "", cnpj: "", razao_social: "", nome_fantasia: "", whatsapp: "", plan_status: "" });
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deletingStore, setDeletingStore] = useState<StoreRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    const { data } = await (supabase
      .from("stores")
      .select("*, subscription_plans(name, price_monthly, slug)") as any)
      .order("created_at", { ascending: false });

    setStores((data as any) || []);
    setLoading(false);
  };

  const openEdit = (store: StoreRow) => {
    setEditingStore(store);
    setEditForm({
      name: store.name,
      slug: store.slug,
      city: store.city || "",
      state: store.state || "",
      cnpj: store.cnpj || "",
      razao_social: store.razao_social || "",
      nome_fantasia: store.nome_fantasia || "",
      whatsapp: store.whatsapp || "",
      plan_status: store.plan_status || "active",
    });
  };

  const handleSave = async () => {
    if (!editingStore) return;
    if (!editForm.name.trim() || !editForm.slug.trim()) {
      toast.error("Nome e slug são obrigatórios");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("stores")
        .update({
          name: editForm.name.trim(),
          slug: editForm.slug.trim(),
          city: editForm.city.trim() || null,
          state: editForm.state.trim() || null,
          cnpj: editForm.cnpj.trim() || null,
          razao_social: editForm.razao_social.trim() || null,
          nome_fantasia: editForm.nome_fantasia.trim() || null,
          whatsapp: editForm.whatsapp.trim() || null,
          plan_status: editForm.plan_status || "active",
        } as any)
        .eq("id", editingStore.id);

      if (error) throw error;
      toast.success("Loja atualizada com sucesso!");
      setEditingStore(null);
      loadStores();
    } catch (err: any) {
      toast.error("Erro ao salvar: " + (err.message || "Tente novamente"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingStore) return;
    setDeleting(true);
    try {
      // Delete related data first
      await supabase.from("proposals").delete().eq("store_id", deletingStore.id);
      await supabase.from("store_settings").delete().eq("store_id", deletingStore.id);
      await supabase.from("pool_models").delete().eq("store_id", deletingStore.id);
      await supabase.from("categories").delete().eq("store_id", deletingStore.id);
      await supabase.from("brands").delete().eq("store_id", deletingStore.id);
      await supabase.from("optionals").delete().eq("store_id", deletingStore.id);
      await supabase.from("optional_groups").delete().eq("store_id", deletingStore.id);
      await supabase.from("model_optionals").delete().eq("store_id", deletingStore.id);

      // Delete profiles linked to this store
      await supabase.from("profiles").delete().eq("store_id", deletingStore.id);

      // Delete the store
      const { error } = await supabase.from("stores").delete().eq("id", deletingStore.id);
      if (error) throw error;

      toast.success(`Loja "${deletingStore.name}" excluída com sucesso!`);
      setDeletingStore(null);
      loadStores();
    } catch (err: any) {
      toast.error("Erro ao excluir: " + (err.message || "Tente novamente"));
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleLeadPlan = async (storeId: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from("stores")
        .update({ lead_plan_active: active })
        .eq("id", storeId);
      if (error) throw error;
      toast.success(active ? "Distribuição de leads habilitada!" : "Distribuição de leads desabilitada");
      loadStores();
    } catch (err: any) {
      toast.error("Erro ao alterar: " + (err.message || "Tente novamente"));
    }
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
    if (status === "active") return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Ativo</Badge>;
    if (status === "overdue") return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Inadimplente</Badge>;
    if (status === "cancelled" || status === "canceled") return <Badge className="bg-muted text-muted-foreground border-border">Cancelado</Badge>;
    if (status === "expired") return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Expirado</Badge>;
    return <Badge variant="outline">Sem plano</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-8">
        <Skeleton className="h-8 w-64 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[180px] rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-[18px] font-semibold text-foreground">Lojas Cadastradas</h1>
        <p className="text-[13px] text-muted-foreground">{stores.length} lojas no total</p>
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
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <Store className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="font-semibold">{store.name}</h3>
                  {statusBadge(store.plan_status)}
                </div>
                <div className="flex gap-4 mt-1.5 text-sm text-muted-foreground flex-wrap">
                  {store.city && <span>{store.city}/{store.state}</span>}
                  {store.cnpj && <span>CNPJ: {store.cnpj}</span>}
                  {(store as any).whatsapp && <span>📱 {(store as any).whatsapp}</span>}
                  <span>Cadastro: {formatDate(store.created_at)}</span>
                  <span className="font-mono text-xs">/{store.slug}</span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className="font-bold text-primary">
                  {formatCurrency(store.subscription_plans?.price_monthly || 0)}/mês
                </p>
                <p className="text-xs text-muted-foreground">
                  {store.subscription_plans?.name || "Gratuito"}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1.5 mr-2" title="Habilitar distribuição de leads">
                  <Radio className="w-3.5 h-3.5 text-muted-foreground" />
                  <Switch
                    checked={!!store.lead_plan_active}
                    onCheckedChange={(checked) => handleToggleLeadPlan(store.id, checked)}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                  <span className="text-xs text-muted-foreground hidden lg:inline">Leads</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => openEdit(store)} title="Editar">
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={() => setDeletingStore(store)} title="Excluir">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-8">Nenhuma loja encontrada.</p>
        )}
      </div>

      {/* ── Edit Dialog ── */}
      <Dialog open={!!editingStore} onOpenChange={(open) => !open && setEditingStore(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Loja</DialogTitle>
            <DialogDescription>Altere os dados da loja e clique em salvar.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nome da Loja *</Label>
                <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Slug *</Label>
                <Input value={editForm.slug} onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nome Fantasia</Label>
                <Input value={editForm.nome_fantasia} onChange={(e) => setEditForm({ ...editForm, nome_fantasia: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Razão Social</Label>
                <Input value={editForm.razao_social} onChange={(e) => setEditForm({ ...editForm, razao_social: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>CNPJ</Label>
                <Input value={editForm.cnpj} onChange={(e) => setEditForm({ ...editForm, cnpj: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>WhatsApp</Label>
                <Input value={editForm.whatsapp} onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })} placeholder="(43) 99999-9999" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Cidade</Label>
                <Input value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Input value={editForm.state} onChange={(e) => setEditForm({ ...editForm, state: e.target.value })} maxLength={2} placeholder="SP" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Status do Plano</Label>
              <Select value={editForm.plan_status} onValueChange={(v) => setEditForm({ ...editForm, plan_status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="overdue">Inadimplente</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                  <SelectItem value="expired">Expirado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingStore(null)} disabled={saving}>
              <X className="w-4 h-4 mr-1" /> Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={!!deletingStore} onOpenChange={(open) => !open && setDeletingStore(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir loja "{deletingStore?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. Todos os dados da loja serão excluídos permanentemente,
              incluindo propostas, modelos, categorias, opcionais e perfis de usuários vinculados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700">
              {deleting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1" />}
              Excluir Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MatrizStores;
