import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2, Plus, Trash2, ChevronDown, ChevronRight, Pencil, Check, X,
  Package, FolderTree, Box, Sparkles, Image as ImageIcon, Ruler, Calendar, Upload,
} from "lucide-react";
import { toast } from "sonner";
import { useRef } from "react";

interface Partner { id: string; name: string }
interface OptionalItem {
  id: string; name: string; description: string | null; item_type: string;
  is_default: boolean; display_order: number;
}
interface IncludedItem {
  id: string; name: string; description: string | null; quantity: number;
  item_type: string; display_order: number;
}
interface Model {
  id: string;
  partner_catalog_category_id: string;
  name: string;
  description: string | null;
  length: number | null;
  width: number | null;
  depth: number | null;
  photo_url: string | null;
  delivery_days: number | null;
  installation_days: number | null;
  payment_terms: string | null;
  notes: string | null;
  differentials: string[];
  not_included_items: string[];
  display_order: number;
  optionals: OptionalItem[];
  included: IncludedItem[];
}
interface Category { id: string; name: string; models: Model[] }

const emptyModelForm = {
  name: "", description: "",
  length: "", width: "", depth: "",
  photo_url: "",
  delivery_days: "30", installation_days: "5",
  payment_terms: "À vista",
  notes: "",
  differentials: [] as string[], newDifferential: "",
  not_included_items: [] as string[], newNotIncluded: "",
};

const MatrizPartnerCatalog = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [partnerId, setPartnerId] = useState<string>("");
  const [brandId, setBrandId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [newCategory, setNewCategory] = useState("");
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatValue, setEditingCatValue] = useState("");

  // Model dialog
  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [modelCategoryId, setModelCategoryId] = useState<string>("");
  const [modelForm, setModelForm] = useState(emptyModelForm);
  const [savingModel, setSavingModel] = useState(false);
  const [modelTab, setModelTab] = useState("dados");

  // Opcionais / inclusos forms (per model, used inside the dialog tabs)
  const [optForm, setOptForm] = useState({ name: "", description: "", item_type: "material", is_default: false });
  const [editingOptId, setEditingOptId] = useState<string | null>(null);
  const [inclForm, setInclForm] = useState({ name: "", description: "", quantity: "1", item_type: "material" });
  const [editingInclId, setEditingInclId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("partners").select("id, name").order("name");
      setPartners((data as Partner[]) || []);
      if (data && data.length > 0) setPartnerId(data[0].id);
      setLoading(false);
    })();
  }, []);

  useEffect(() => { if (partnerId) loadCatalog(); /* eslint-disable-next-line */ }, [partnerId]);

  const ensureBrand = async (pid: string): Promise<string | null> => {
    const { data: existing } = await supabase.from("partner_catalog_brands")
      .select("id").eq("partner_id", pid).order("display_order").limit(1).maybeSingle();
    if (existing?.id) return existing.id;
    const partner = partners.find(p => p.id === pid);
    const { data: created, error } = await supabase.from("partner_catalog_brands")
      .insert({ partner_id: pid, name: partner?.name || "Padrão", display_order: 0 })
      .select("id").single();
    if (error) { toast.error("Erro ao preparar catálogo"); return null; }
    return created.id;
  };

  const loadCatalog = async () => {
    setLoadingCatalog(true);
    const bid = await ensureBrand(partnerId);
    if (!bid) { setLoadingCatalog(false); return; }
    setBrandId(bid);

    const [cRes, mRes, moRes, miRes] = await Promise.all([
      supabase.from("partner_catalog_categories")
        .select("id, name, display_order")
        .eq("partner_catalog_brand_id", bid).order("display_order"),
      supabase.from("partner_catalog_models")
        .select("id, name, description, partner_catalog_category_id, length, width, depth, photo_url, delivery_days, installation_days, payment_terms, notes, differentials, not_included_items, display_order")
        .order("display_order"),
      supabase.from("partner_catalog_model_optionals")
        .select("id, name, description, item_type, is_default, partner_catalog_model_id, display_order")
        .order("display_order"),
      supabase.from("partner_catalog_model_included_items")
        .select("id, name, description, quantity, item_type, partner_catalog_model_id, display_order")
        .order("display_order"),
    ]);

    const cats = cRes.data || [];
    const cIds = new Set(cats.map((c: any) => c.id));
    const models = (mRes.data || []).filter((m: any) => cIds.has(m.partner_catalog_category_id));

    setCategories(cats.map((c: any) => ({
      id: c.id, name: c.name,
      models: models.filter((m: any) => m.partner_catalog_category_id === c.id).map((m: any): Model => ({
        id: m.id,
        partner_catalog_category_id: m.partner_catalog_category_id,
        name: m.name,
        description: m.description,
        length: m.length, width: m.width, depth: m.depth,
        photo_url: m.photo_url,
        delivery_days: m.delivery_days, installation_days: m.installation_days,
        payment_terms: m.payment_terms, notes: m.notes,
        differentials: m.differentials || [],
        not_included_items: m.not_included_items || [],
        display_order: m.display_order,
        optionals: ((moRes.data || []) as any[])
          .filter((o) => o.partner_catalog_model_id === m.id)
          .map((o) => ({ id: o.id, name: o.name, description: o.description, item_type: o.item_type, is_default: o.is_default, display_order: o.display_order })),
        included: ((miRes.data || []) as any[])
          .filter((i) => i.partner_catalog_model_id === m.id)
          .map((i) => ({ id: i.id, name: i.name, description: i.description, quantity: i.quantity, item_type: i.item_type, display_order: i.display_order })),
      })),
    })));
    setLoadingCatalog(false);
  };

  const toggle = (id: string) => setExpanded(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  // ---- CATEGORIES ----
  const addCategory = async () => {
    const name = newCategory.trim();
    if (!name || !brandId) return;
    const { error } = await supabase.from("partner_catalog_categories")
      .insert({ partner_catalog_brand_id: brandId, name, display_order: categories.length });
    if (error) return toast.error("Erro ao adicionar categoria");
    setNewCategory(""); toast.success("Categoria criada");
    await loadCatalog();
  };

  const saveCategoryName = async (id: string) => {
    const { error } = await supabase.from("partner_catalog_categories").update({ name: editingCatValue }).eq("id", id);
    if (error) return toast.error("Erro ao salvar");
    setEditingCatId(null); setEditingCatValue(""); await loadCatalog();
  };

  const deleteCategory = async (id: string, name: string) => {
    if (!confirm(`Remover categoria "${name}" e todos os modelos?`)) return;
    const { error } = await supabase.from("partner_catalog_categories").delete().eq("id", id);
    if (error) return toast.error("Erro ao remover");
    toast.success("Categoria removida"); await loadCatalog();
  };

  // ---- MODELS ----
  const openCreateModel = (categoryId: string) => {
    setEditingModelId(null);
    setModelCategoryId(categoryId);
    setModelForm(emptyModelForm);
    setModelTab("dados");
    setOptForm({ name: "", description: "", item_type: "material", is_default: false });
    setInclForm({ name: "", description: "", quantity: "1", item_type: "material" });
    setEditingOptId(null); setEditingInclId(null);
    setModelDialogOpen(true);
  };

  const openEditModel = (m: Model) => {
    setEditingModelId(m.id);
    setModelCategoryId(m.partner_catalog_category_id);
    setModelForm({
      name: m.name, description: m.description || "",
      length: m.length?.toString() || "", width: m.width?.toString() || "", depth: m.depth?.toString() || "",
      photo_url: m.photo_url || "",
      delivery_days: (m.delivery_days ?? 30).toString(),
      installation_days: (m.installation_days ?? 5).toString(),
      payment_terms: m.payment_terms || "À vista",
      notes: m.notes || "",
      differentials: m.differentials || [], newDifferential: "",
      not_included_items: m.not_included_items || [], newNotIncluded: "",
    });
    setModelTab("dados");
    setOptForm({ name: "", description: "", item_type: "material", is_default: false });
    setInclForm({ name: "", description: "", quantity: "1", item_type: "material" });
    setEditingOptId(null); setEditingInclId(null);
    setModelDialogOpen(true);
  };

  const saveModel = async (): Promise<string | null> => {
    if (!modelForm.name.trim()) { toast.error("Informe o nome do modelo"); return null; }
    if (!modelCategoryId) { toast.error("Categoria inválida"); return null; }
    setSavingModel(true);
    try {
      const cat = categories.find(c => c.id === modelCategoryId);
      const payload = {
        partner_catalog_category_id: modelCategoryId,
        name: modelForm.name.trim(),
        description: modelForm.description || null,
        length: modelForm.length ? parseFloat(modelForm.length) : null,
        width: modelForm.width ? parseFloat(modelForm.width) : null,
        depth: modelForm.depth ? parseFloat(modelForm.depth) : null,
        photo_url: modelForm.photo_url || null,
        delivery_days: parseInt(modelForm.delivery_days) || 30,
        installation_days: parseInt(modelForm.installation_days) || 5,
        payment_terms: modelForm.payment_terms || "À vista",
        notes: modelForm.notes || null,
        differentials: modelForm.differentials,
        not_included_items: modelForm.not_included_items,
      };
      if (editingModelId) {
        const { error } = await supabase.from("partner_catalog_models").update(payload).eq("id", editingModelId);
        if (error) throw error;
        toast.success("Modelo atualizado");
        await loadCatalog();
        return editingModelId;
      } else {
        const { data, error } = await supabase.from("partner_catalog_models")
          .insert({ ...payload, display_order: cat?.models.length || 0 })
          .select("id").single();
        if (error) throw error;
        setEditingModelId(data.id);
        toast.success("Modelo criado");
        await loadCatalog();
        return data.id;
      }
    } catch (e: any) {
      console.error(e); toast.error("Erro ao salvar modelo"); return null;
    } finally { setSavingModel(false); }
  };

  const deleteModel = async (id: string, name: string) => {
    if (!confirm(`Remover modelo "${name}"?`)) return;
    const { error } = await supabase.from("partner_catalog_models").delete().eq("id", id);
    if (error) return toast.error("Erro ao remover");
    toast.success("Modelo removido"); await loadCatalog();
  };

  // ---- OPTIONALS ----
  const submitOptional = async () => {
    let mid = editingModelId;
    if (!mid) { mid = await saveModel(); if (!mid) return; }
    if (!optForm.name.trim()) { toast.error("Nome do opcional obrigatório"); return; }
    const currentModel = categories.flatMap(c => c.models).find(m => m.id === mid);
    const payload = {
      partner_catalog_model_id: mid,
      name: optForm.name.trim(),
      description: optForm.description || null,
      item_type: optForm.item_type,
      is_default: optForm.is_default,
    };
    if (editingOptId) {
      const { error } = await supabase.from("partner_catalog_model_optionals").update(payload).eq("id", editingOptId);
      if (error) return toast.error("Erro ao salvar opcional");
      toast.success("Opcional atualizado");
    } else {
      const { error } = await supabase.from("partner_catalog_model_optionals")
        .insert({ ...payload, display_order: currentModel?.optionals.length || 0 });
      if (error) return toast.error("Erro ao salvar opcional");
      toast.success("Opcional adicionado");
    }
    setOptForm({ name: "", description: "", item_type: "material", is_default: false });
    setEditingOptId(null);
    await loadCatalog();
  };

  const editOptional = (o: OptionalItem) => {
    setEditingOptId(o.id);
    setOptForm({ name: o.name, description: o.description || "", item_type: o.item_type, is_default: o.is_default });
  };

  const deleteOptional = async (id: string) => {
    if (!confirm("Remover opcional?")) return;
    const { error } = await supabase.from("partner_catalog_model_optionals").delete().eq("id", id);
    if (error) return toast.error("Erro ao remover");
    await loadCatalog();
  };

  // ---- INCLUDED ITEMS ----
  const submitIncluded = async () => {
    let mid = editingModelId;
    if (!mid) { mid = await saveModel(); if (!mid) return; }
    if (!inclForm.name.trim()) { toast.error("Nome do item obrigatório"); return; }
    const currentModel = categories.flatMap(c => c.models).find(m => m.id === mid);
    const payload = {
      partner_catalog_model_id: mid,
      name: inclForm.name.trim(),
      description: inclForm.description || null,
      quantity: parseInt(inclForm.quantity) || 1,
      item_type: inclForm.item_type,
    };
    if (editingInclId) {
      const { error } = await supabase.from("partner_catalog_model_included_items").update(payload).eq("id", editingInclId);
      if (error) return toast.error("Erro ao salvar item");
      toast.success("Item atualizado");
    } else {
      const { error } = await supabase.from("partner_catalog_model_included_items")
        .insert({ ...payload, display_order: currentModel?.included.length || 0 });
      if (error) return toast.error("Erro ao salvar item");
      toast.success("Item adicionado");
    }
    setInclForm({ name: "", description: "", quantity: "1", item_type: "material" });
    setEditingInclId(null);
    await loadCatalog();
  };

  const editIncluded = (i: IncludedItem) => {
    setEditingInclId(i.id);
    setInclForm({ name: i.name, description: i.description || "", quantity: i.quantity.toString(), item_type: i.item_type });
  };

  const deleteIncluded = async (id: string) => {
    if (!confirm("Remover item?")) return;
    const { error } = await supabase.from("partner_catalog_model_included_items").delete().eq("id", id);
    if (error) return toast.error("Erro ao remover");
    await loadCatalog();
  };

  // helpers for differentials / not_included arrays in model form
  const addToArr = (field: "differentials" | "not_included_items", inputField: "newDifferential" | "newNotIncluded") => {
    const v = (modelForm[inputField] as string).trim();
    if (!v) return;
    setModelForm(p => ({ ...p, [field]: [...p[field], v], [inputField]: "" }));
  };
  const removeFromArr = (field: "differentials" | "not_included_items", idx: number) => {
    setModelForm(p => ({ ...p, [field]: p[field].filter((_, i) => i !== idx) }));
  };

  if (loading) {
    return <div className="space-y-4 p-4 md:p-6"><Skeleton className="h-10 w-72" /><Skeleton className="h-[400px]" /></div>;
  }

  const currentEditingModel = editingModelId
    ? categories.flatMap(c => c.models).find(m => m.id === editingModelId)
    : null;

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-[18px] font-semibold text-foreground flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" /> Catálogo de Marcas
        </h1>
        <p className="text-[13px] text-muted-foreground">
          Cadastre o catálogo padrão completo (categorias, modelos, dimensões, prazos, opcionais e itens). Lojistas vinculados receberão automaticamente.
        </p>
      </div>

      <Card className="p-4 md:p-6 space-y-4">
        <div>
          <Label>Marca / Parceiro</Label>
          <Select value={partnerId} onValueChange={setPartnerId}>
            <SelectTrigger className="max-w-md mt-1.5"><SelectValue placeholder="Selecione uma marca" /></SelectTrigger>
            <SelectContent>
              {partners.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {partners.length === 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              Nenhuma marca cadastrada. Crie em <strong>Marcas</strong> primeiro.
            </p>
          )}
        </div>

        {partnerId && (
          <div className="flex items-end gap-2 pt-2 border-t border-border">
            <div className="flex-1">
              <Label className="text-xs flex items-center gap-1.5"><FolderTree className="w-3.5 h-3.5" /> Nova Categoria</Label>
              <Input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="Ex: Fibra de Vidro"
                onKeyDown={e => { if (e.key === "Enter") addCategory(); }} className="mt-1" />
            </div>
            <Button onClick={addCategory} disabled={!newCategory.trim()} className="gap-1">
              <Plus className="w-4 h-4" /> Categoria
            </Button>
          </div>
        )}
      </Card>

      {partnerId && (
        <Card className="p-4 md:p-6">
          {loadingCatalog ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : categories.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              Nenhuma categoria cadastrada. Adicione a primeira categoria acima.
            </p>
          ) : (
            <div className="space-y-3">
              {categories.map(c => (
                <div key={c.id} className="border rounded-lg overflow-hidden">
                  <div className="flex items-center gap-2 p-3 bg-muted/40">
                    <button onClick={() => toggle(c.id)} className="shrink-0">
                      {expanded.has(c.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <FolderTree className="w-4 h-4 text-primary shrink-0" />
                    {editingCatId === c.id ? (
                      <div className="flex items-center gap-1 flex-1">
                        <Input value={editingCatValue} onChange={e => setEditingCatValue(e.target.value)} className="h-7 text-sm" autoFocus
                          onKeyDown={e => { if (e.key === "Enter") saveCategoryName(c.id); if (e.key === "Escape") setEditingCatId(null); }} />
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveCategoryName(c.id)}><Check className="w-3.5 h-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingCatId(null)}><X className="w-3.5 h-3.5" /></Button>
                      </div>
                    ) : (
                      <span className="flex-1 flex items-center gap-1 text-sm font-semibold">
                        {c.name}
                        <Button size="icon" variant="ghost" className="h-6 w-6 opacity-40 hover:opacity-100"
                          onClick={() => { setEditingCatId(c.id); setEditingCatValue(c.name); }}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                      </span>
                    )}
                    <span className="text-[11px] text-muted-foreground shrink-0">{c.models.length} modelo(s)</span>
                    <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => openCreateModel(c.id)}>
                      <Plus className="w-3.5 h-3.5" /> Modelo
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive shrink-0"
                      onClick={() => deleteCategory(c.id, c.name)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {expanded.has(c.id) && (
                    <div className="p-3 space-y-2">
                      {c.models.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic px-2 py-3">
                          Nenhum modelo. Use o botão "Modelo" acima para criar.
                        </p>
                      ) : c.models.map(m => (
                        <div key={m.id} className="flex items-center gap-3 p-2.5 border rounded-md hover:bg-muted/30">
                          {m.photo_url ? (
                            <img src={m.photo_url} alt={m.name} className="w-12 h-12 rounded object-cover shrink-0" />
                          ) : (
                            <div className="w-12 h-12 rounded bg-muted flex items-center justify-center shrink-0">
                              <ImageIcon className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium truncate">{m.name}</span>
                              {(m.length || m.width || m.depth) && (
                                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                  <Ruler className="w-3 h-3" />
                                  {[m.length, m.width, m.depth].filter(Boolean).join(" × ")} m
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5">
                              <Badge variant="secondary" className="text-[10px] py-0 h-4">
                                {m.optionals.length} opcionais
                              </Badge>
                              <Badge variant="secondary" className="text-[10px] py-0 h-4">
                                {m.included.length} itens
                              </Badge>
                              {m.delivery_days && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Calendar className="w-2.5 h-2.5" /> {m.delivery_days}d
                                </span>
                              )}
                            </div>
                          </div>
                          <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => openEditModel(m)}>
                            <Pencil className="w-3 h-3" /> Editar
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive"
                            onClick={() => deleteModel(m.id, m.name)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ===== MODEL DIALOG ===== */}
      <Dialog open={modelDialogOpen} onOpenChange={(o) => { if (!o) { setModelDialogOpen(false); setEditingModelId(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Box className="w-5 h-5 text-primary" />
              {editingModelId ? "Editar Modelo" : "Novo Modelo"}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={modelTab} onValueChange={setModelTab} className="mt-2">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="dados">Dados</TabsTrigger>
              <TabsTrigger value="opcionais" disabled={!editingModelId}>
                Opcionais {currentEditingModel && `(${currentEditingModel.optionals.length})`}
              </TabsTrigger>
              <TabsTrigger value="inclusos" disabled={!editingModelId}>
                Itens Inclusos {currentEditingModel && `(${currentEditingModel.included.length})`}
              </TabsTrigger>
            </TabsList>

            {/* ----- DADOS ----- */}
            <TabsContent value="dados" className="space-y-4 mt-4">
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <Label>Nome do modelo *</Label>
                  <Input value={modelForm.name} onChange={e => setModelForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Ex: Atlantis 7m" />
                </div>
                <div>
                  <Label>URL da foto</Label>
                  <Input value={modelForm.photo_url} onChange={e => setModelForm(p => ({ ...p, photo_url: e.target.value }))}
                    placeholder="https://..." />
                </div>
              </div>

              <div>
                <Label>Descrição</Label>
                <Textarea rows={2} value={modelForm.description}
                  onChange={e => setModelForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Descrição comercial do modelo..." />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Comprimento (m)</Label>
                  <Input type="number" step="0.01" value={modelForm.length}
                    onChange={e => setModelForm(p => ({ ...p, length: e.target.value }))} />
                </div>
                <div>
                  <Label>Largura (m)</Label>
                  <Input type="number" step="0.01" value={modelForm.width}
                    onChange={e => setModelForm(p => ({ ...p, width: e.target.value }))} />
                </div>
                <div>
                  <Label>Profundidade (m)</Label>
                  <Input type="number" step="0.01" value={modelForm.depth}
                    onChange={e => setModelForm(p => ({ ...p, depth: e.target.value }))} />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-3">
                <div>
                  <Label>Prazo de entrega (dias)</Label>
                  <Input type="number" value={modelForm.delivery_days}
                    onChange={e => setModelForm(p => ({ ...p, delivery_days: e.target.value }))} />
                </div>
                <div>
                  <Label>Prazo de instalação (dias)</Label>
                  <Input type="number" value={modelForm.installation_days}
                    onChange={e => setModelForm(p => ({ ...p, installation_days: e.target.value }))} />
                </div>
                <div>
                  <Label>Forma de pagamento</Label>
                  <Input value={modelForm.payment_terms}
                    onChange={e => setModelForm(p => ({ ...p, payment_terms: e.target.value }))}
                    placeholder="Ex: À vista" />
                </div>
              </div>

              <div>
                <Label>Diferenciais</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={modelForm.newDifferential}
                    onChange={e => setModelForm(p => ({ ...p, newDifferential: e.target.value }))}
                    placeholder="Adicionar diferencial..."
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addToArr("differentials", "newDifferential"); } }} />
                  <Button type="button" variant="outline" onClick={() => addToArr("differentials", "newDifferential")}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {modelForm.differentials.map((d, i) => (
                    <Badge key={i} variant="secondary" className="gap-1 pr-1">
                      {d}
                      <button onClick={() => removeFromArr("differentials", i)}><X className="w-3 h-3" /></button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label>Itens NÃO inclusos (texto)</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={modelForm.newNotIncluded}
                    onChange={e => setModelForm(p => ({ ...p, newNotIncluded: e.target.value }))}
                    placeholder="Adicionar item não incluso..."
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addToArr("not_included_items", "newNotIncluded"); } }} />
                  <Button type="button" variant="outline" onClick={() => addToArr("not_included_items", "newNotIncluded")}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {modelForm.not_included_items.map((d, i) => (
                    <Badge key={i} variant="outline" className="gap-1 pr-1">
                      {d}
                      <button onClick={() => removeFromArr("not_included_items", i)}><X className="w-3 h-3" /></button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea rows={2} value={modelForm.notes}
                  onChange={e => setModelForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </TabsContent>

            {/* ----- OPCIONAIS ----- */}
            <TabsContent value="opcionais" className="space-y-4 mt-4">
              <Card className="p-3 space-y-2 bg-muted/30">
                <div className="grid md:grid-cols-2 gap-2">
                  <Input placeholder="Nome do opcional *" value={optForm.name}
                    onChange={e => setOptForm(p => ({ ...p, name: e.target.value }))} />
                  <Select value={optForm.item_type} onValueChange={v => setOptForm(p => ({ ...p, item_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="material">Material</SelectItem>
                      <SelectItem value="servico">Serviço</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Textarea rows={2} placeholder="Descrição..." value={optForm.description}
                  onChange={e => setOptForm(p => ({ ...p, description: e.target.value }))} />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch checked={optForm.is_default}
                      onCheckedChange={v => setOptForm(p => ({ ...p, is_default: v }))} />
                    Vir marcado por padrão
                  </label>
                  <div className="flex gap-2">
                    {editingOptId && (
                      <Button variant="ghost" size="sm" onClick={() => {
                        setEditingOptId(null);
                        setOptForm({ name: "", description: "", item_type: "material", is_default: false });
                      }}>Cancelar</Button>
                    )}
                    <Button size="sm" onClick={submitOptional} className="gap-1">
                      {editingOptId ? <><Check className="w-3.5 h-3.5" /> Salvar</> : <><Plus className="w-3.5 h-3.5" /> Adicionar</>}
                    </Button>
                  </div>
                </div>
              </Card>

              <div className="space-y-1.5">
                {currentEditingModel?.optionals.length === 0 && (
                  <p className="text-xs text-center text-muted-foreground py-4">Nenhum opcional cadastrado.</p>
                )}
                {currentEditingModel?.optionals.map(o => (
                  <div key={o.id} className="flex items-center gap-2 p-2 border rounded">
                    <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm flex items-center gap-2">
                        {o.name}
                        {o.is_default && <Badge variant="secondary" className="text-[10px] py-0 h-4">padrão</Badge>}
                        <Badge variant="outline" className="text-[10px] py-0 h-4">{o.item_type}</Badge>
                      </div>
                      {o.description && <p className="text-[11px] text-muted-foreground truncate">{o.description}</p>}
                    </div>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => editOptional(o)}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteOptional(o.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* ----- INCLUSOS ----- */}
            <TabsContent value="inclusos" className="space-y-4 mt-4">
              <Card className="p-3 space-y-2 bg-muted/30">
                <div className="grid md:grid-cols-3 gap-2">
                  <Input className="md:col-span-2" placeholder="Nome do item *" value={inclForm.name}
                    onChange={e => setInclForm(p => ({ ...p, name: e.target.value }))} />
                  <Input type="number" min="1" placeholder="Qtd" value={inclForm.quantity}
                    onChange={e => setInclForm(p => ({ ...p, quantity: e.target.value }))} />
                </div>
                <div className="grid md:grid-cols-2 gap-2">
                  <Select value={inclForm.item_type} onValueChange={v => setInclForm(p => ({ ...p, item_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="material">Material</SelectItem>
                      <SelectItem value="servico">Serviço</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Textarea rows={2} placeholder="Descrição (opcional)" value={inclForm.description}
                  onChange={e => setInclForm(p => ({ ...p, description: e.target.value }))} />
                <div className="flex justify-end gap-2">
                  {editingInclId && (
                    <Button variant="ghost" size="sm" onClick={() => {
                      setEditingInclId(null);
                      setInclForm({ name: "", description: "", quantity: "1", item_type: "material" });
                    }}>Cancelar</Button>
                  )}
                  <Button size="sm" onClick={submitIncluded} className="gap-1">
                    {editingInclId ? <><Check className="w-3.5 h-3.5" /> Salvar</> : <><Plus className="w-3.5 h-3.5" /> Adicionar</>}
                  </Button>
                </div>
              </Card>

              <div className="space-y-1.5">
                {currentEditingModel?.included.length === 0 && (
                  <p className="text-xs text-center text-muted-foreground py-4">Nenhum item incluso cadastrado.</p>
                )}
                {currentEditingModel?.included.map(i => (
                  <div key={i.id} className="flex items-center gap-2 p-2 border rounded">
                    <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm flex items-center gap-2">
                        {i.quantity > 1 && <span className="text-muted-foreground text-xs">{i.quantity}x</span>}
                        {i.name}
                        <Badge variant="outline" className="text-[10px] py-0 h-4">{i.item_type}</Badge>
                      </div>
                      {i.description && <p className="text-[11px] text-muted-foreground truncate">{i.description}</p>}
                    </div>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => editIncluded(i)}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteIncluded(i.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => { setModelDialogOpen(false); setEditingModelId(null); }}>
              Fechar
            </Button>
            <Button onClick={async () => { await saveModel(); }} disabled={savingModel}>
              {savingModel ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              {editingModelId ? "Salvar Alterações" : "Criar Modelo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MatrizPartnerCatalog;
