import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Loader2, Plus, Trash2, ChevronDown, ChevronRight, Pencil, Check, X,
  Package, FolderTree, Tag, Box, Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface Partner { id: string; name: string }
interface SimpleItem { id: string; name: string; description?: string | null }
interface Model { id: string; name: string; optionals: SimpleItem[]; included: SimpleItem[] }
interface Category { id: string; name: string; models: Model[] }
interface Brand { id: string; name: string; categories: Category[] }

const MatrizPartnerCatalog = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [partnerId, setPartnerId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<{ table: string; id: string } | null>(null);
  const [editValue, setEditValue] = useState("");

  // New entity inputs
  const [newBrand, setNewBrand] = useState("");
  const [newCategory, setNewCategory] = useState<Record<string, string>>({});
  const [newModel, setNewModel] = useState<Record<string, string>>({});
  const [newOptional, setNewOptional] = useState<Record<string, string>>({});
  const [newIncluded, setNewIncluded] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("partners").select("id, name").order("name");
      setPartners((data as Partner[]) || []);
      if (data && data.length > 0) setPartnerId(data[0].id);
      setLoading(false);
    })();
  }, []);

  useEffect(() => { if (partnerId) loadCatalog(); }, [partnerId]);

  const loadCatalog = async () => {
    setLoadingCatalog(true);
    const [bRes, cRes, mRes, moRes, miRes] = await Promise.all([
      supabase.from("partner_catalog_brands").select("id, name, display_order").eq("partner_id", partnerId).order("display_order"),
      supabase.from("partner_catalog_categories").select("id, name, partner_catalog_brand_id, display_order").order("display_order"),
      supabase.from("partner_catalog_models").select("id, name, partner_catalog_category_id, display_order").order("display_order"),
      supabase.from("partner_catalog_model_optionals").select("id, name, description, partner_catalog_model_id, display_order").order("display_order"),
      supabase.from("partner_catalog_model_included_items").select("id, name, description, partner_catalog_model_id, display_order").order("display_order"),
    ]);
    const bIds = new Set((bRes.data || []).map((b: any) => b.id));
    const cats = (cRes.data || []).filter((c: any) => bIds.has(c.partner_catalog_brand_id));
    const cIds = new Set(cats.map((c: any) => c.id));
    const models = (mRes.data || []).filter((m: any) => cIds.has(m.partner_catalog_category_id));
    setBrands((bRes.data || []).map((b: any) => ({
      id: b.id, name: b.name,
      categories: cats.filter((c: any) => c.partner_catalog_brand_id === b.id).map((c: any) => ({
        id: c.id, name: c.name,
        models: models.filter((m: any) => m.partner_catalog_category_id === c.id).map((m: any) => ({
          id: m.id, name: m.name,
          optionals: (moRes.data || []).filter((o: any) => o.partner_catalog_model_id === m.id),
          included: (miRes.data || []).filter((i: any) => i.partner_catalog_model_id === m.id),
        })),
      })),
    })));
    setLoadingCatalog(false);
  };

  const toggle = (id: string) => setExpanded(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  // ---- CREATE ----
  const addBrand = async () => {
    const name = newBrand.trim();
    if (!name || !partnerId) return;
    const { error } = await supabase.from("partner_catalog_brands")
      .insert({ partner_id: partnerId, name, display_order: brands.length });
    if (error) return toast.error("Erro ao adicionar marca");
    setNewBrand(""); toast.success("Marca criada");
    await loadCatalog();
  };

  const addCategory = async (brandId: string) => {
    const name = (newCategory[brandId] || "").trim();
    if (!name) return;
    const cur = brands.find(b => b.id === brandId)?.categories.length || 0;
    const { error } = await supabase.from("partner_catalog_categories")
      .insert({ partner_catalog_brand_id: brandId, name, display_order: cur });
    if (error) return toast.error("Erro ao adicionar categoria");
    setNewCategory(p => ({ ...p, [brandId]: "" })); toast.success("Categoria criada");
    setExpanded(p => new Set(p).add(brandId));
    await loadCatalog();
  };

  const addModel = async (categoryId: string) => {
    const name = (newModel[categoryId] || "").trim();
    if (!name) return;
    const cat = brands.flatMap(b => b.categories).find(c => c.id === categoryId);
    const { error } = await supabase.from("partner_catalog_models")
      .insert({ partner_catalog_category_id: categoryId, name, display_order: cat?.models.length || 0 });
    if (error) return toast.error("Erro ao adicionar modelo");
    setNewModel(p => ({ ...p, [categoryId]: "" })); toast.success("Modelo criado");
    setExpanded(p => new Set(p).add(categoryId));
    await loadCatalog();
  };

  const addOptional = async (modelId: string) => {
    const name = (newOptional[modelId] || "").trim();
    if (!name) return;
    const m = brands.flatMap(b => b.categories).flatMap(c => c.models).find(x => x.id === modelId);
    const { error } = await supabase.from("partner_catalog_model_optionals")
      .insert({ partner_catalog_model_id: modelId, name, display_order: m?.optionals.length || 0 });
    if (error) return toast.error("Erro ao adicionar opcional");
    setNewOptional(p => ({ ...p, [modelId]: "" }));
    await loadCatalog();
  };

  const addIncluded = async (modelId: string) => {
    const name = (newIncluded[modelId] || "").trim();
    if (!name) return;
    const m = brands.flatMap(b => b.categories).flatMap(c => c.models).find(x => x.id === modelId);
    const { error } = await supabase.from("partner_catalog_model_included_items")
      .insert({ partner_catalog_model_id: modelId, name, display_order: m?.included.length || 0 });
    if (error) return toast.error("Erro ao adicionar item");
    setNewIncluded(p => ({ ...p, [modelId]: "" }));
    await loadCatalog();
  };

  // ---- EDIT / DELETE ----
  const saveEdit = async (table: string, id: string) => {
    const { error } = await supabase.from(table as any).update({ name: editValue }).eq("id", id);
    if (error) return toast.error("Erro ao salvar");
    setEditing(null); setEditValue(""); await loadCatalog();
  };

  const deleteRow = async (table: string, id: string, label: string) => {
    if (!confirm(`Remover "${label}"?`)) return;
    const { error } = await supabase.from(table as any).delete().eq("id", id);
    if (error) return toast.error("Erro ao remover");
    toast.success("Removido"); await loadCatalog();
  };

  const renderEditable = (table: string, id: string, name: string, sizeClass = "text-sm") => {
    if (editing?.table === table && editing.id === id) {
      return (
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <Input value={editValue} onChange={e => setEditValue(e.target.value)} className="h-7 text-sm" autoFocus
            onKeyDown={e => { if (e.key === "Enter") saveEdit(table, id); if (e.key === "Escape") setEditing(null); }} />
          <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => saveEdit(table, id)}><Check className="w-3.5 h-3.5" /></Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setEditing(null)}><X className="w-3.5 h-3.5" /></Button>
        </div>
      );
    }
    return (
      <span className={`flex-1 truncate flex items-center gap-1 ${sizeClass}`}>
        <span className="truncate">{name}</span>
        <Button size="icon" variant="ghost" className="h-6 w-6 opacity-40 hover:opacity-100 shrink-0"
          onClick={() => { setEditing({ table, id }); setEditValue(name); }}>
          <Pencil className="w-3 h-3" />
        </Button>
      </span>
    );
  };

  if (loading) {
    return <div className="space-y-4 p-4 md:p-6"><Skeleton className="h-10 w-72" /><Skeleton className="h-[400px]" /></div>;
  }

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-[18px] font-semibold text-foreground flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" /> Catálogo de Parceiros
        </h1>
        <p className="text-[13px] text-muted-foreground">
          Cadastre marcas, categorias, modelos e opcionais padrão. Lojistas que vincularem o parceiro receberão esse catálogo automaticamente.
        </p>
      </div>

      <Card className="p-4 md:p-6 space-y-4">
        <div>
          <Label>Parceiro</Label>
          <Select value={partnerId} onValueChange={setPartnerId}>
            <SelectTrigger className="max-w-md mt-1.5"><SelectValue placeholder="Selecione um parceiro" /></SelectTrigger>
            <SelectContent>
              {partners.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {partners.length === 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              Nenhum parceiro cadastrado. Crie em <strong>Parceiros</strong> primeiro.
            </p>
          )}
        </div>

        {partnerId && (
          <div className="flex items-end gap-2 pt-2 border-t border-border">
            <div className="flex-1">
              <Label className="text-xs flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> Nova Marca</Label>
              <Input value={newBrand} onChange={e => setNewBrand(e.target.value)} placeholder="Ex: iGUi"
                onKeyDown={e => { if (e.key === "Enter") addBrand(); }} className="mt-1" />
            </div>
            <Button onClick={addBrand} disabled={!newBrand.trim()} className="gap-1">
              <Plus className="w-4 h-4" /> Marca
            </Button>
          </div>
        )}
      </Card>

      {partnerId && (
        <Card className="p-4 md:p-6">
          {loadingCatalog ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : brands.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              Nenhuma marca cadastrada. Adicione a primeira marca acima.
            </p>
          ) : (
            <div className="space-y-2">
              {brands.map(b => (
                <div key={b.id} className="border rounded-lg overflow-hidden">
                  {/* Brand row */}
                  <div className="flex items-center gap-1 p-2.5 bg-muted/40">
                    <button onClick={() => toggle(b.id)} className="shrink-0">
                      {expanded.has(b.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <Tag className="w-4 h-4 text-primary shrink-0" />
                    {renderEditable("partner_catalog_brands", b.id, b.name, "text-sm font-semibold")}
                    <span className="text-[11px] text-muted-foreground shrink-0">{b.categories.length} cat.</span>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive shrink-0"
                      onClick={() => deleteRow("partner_catalog_brands", b.id, b.name)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {expanded.has(b.id) && (
                    <div className="pl-6 pr-2 py-2 space-y-2">
                      {/* Add category */}
                      <div className="flex items-center gap-2">
                        <Input value={newCategory[b.id] || ""} onChange={e => setNewCategory(p => ({ ...p, [b.id]: e.target.value }))}
                          placeholder="Nova categoria (Ex: Fibra de Vidro)" className="h-8 text-xs"
                          onKeyDown={e => { if (e.key === "Enter") addCategory(b.id); }} />
                        <Button size="sm" variant="outline" onClick={() => addCategory(b.id)} disabled={!newCategory[b.id]?.trim()} className="gap-1 h-8">
                          <FolderTree className="w-3.5 h-3.5" /> Categoria
                        </Button>
                      </div>

                      {b.categories.map(c => (
                        <div key={c.id} className="border-l-2 border-primary/20 pl-2">
                          <div className="flex items-center gap-1 py-1">
                            <button onClick={() => toggle(c.id)} className="shrink-0">
                              {expanded.has(c.id) ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </button>
                            <FolderTree className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            {renderEditable("partner_catalog_categories", c.id, c.name, "text-sm")}
                            <span className="text-[10px] text-muted-foreground shrink-0">{c.models.length} mod.</span>
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive shrink-0"
                              onClick={() => deleteRow("partner_catalog_categories", c.id, c.name)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>

                          {expanded.has(c.id) && (
                            <div className="pl-4 space-y-1.5 pb-1">
                              <div className="flex items-center gap-2">
                                <Input value={newModel[c.id] || ""} onChange={e => setNewModel(p => ({ ...p, [c.id]: e.target.value }))}
                                  placeholder="Novo modelo (Ex: Modelo Atlantis 7m)" className="h-7 text-xs"
                                  onKeyDown={e => { if (e.key === "Enter") addModel(c.id); }} />
                                <Button size="sm" variant="outline" onClick={() => addModel(c.id)} disabled={!newModel[c.id]?.trim()} className="gap-1 h-7 text-xs">
                                  <Box className="w-3 h-3" /> Modelo
                                </Button>
                              </div>

                              {c.models.map(m => (
                                <div key={m.id} className="border-l border-border pl-2">
                                  <div className="flex items-center gap-1 py-1">
                                    <button onClick={() => toggle(m.id)} className="shrink-0">
                                      {expanded.has(m.id) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                    </button>
                                    <Box className="w-3 h-3 text-muted-foreground shrink-0" />
                                    {renderEditable("partner_catalog_models", m.id, m.name, "text-xs")}
                                    <span className="text-[10px] text-muted-foreground shrink-0">
                                      {m.optionals.length}op · {m.included.length}inc
                                    </span>
                                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive shrink-0"
                                      onClick={() => deleteRow("partner_catalog_models", m.id, m.name)}>
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>

                                  {expanded.has(m.id) && (
                                    <div className="pl-4 grid md:grid-cols-2 gap-3 pb-2">
                                      {/* Optionals */}
                                      <div className="space-y-1">
                                        <p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                                          <Sparkles className="w-3 h-3" /> Opcionais padrão
                                        </p>
                                        <div className="flex items-center gap-1">
                                          <Input value={newOptional[m.id] || ""} onChange={e => setNewOptional(p => ({ ...p, [m.id]: e.target.value }))}
                                            placeholder="Novo opcional" className="h-7 text-xs"
                                            onKeyDown={e => { if (e.key === "Enter") addOptional(m.id); }} />
                                          <Button size="icon" variant="outline" className="h-7 w-7 shrink-0" onClick={() => addOptional(m.id)} disabled={!newOptional[m.id]?.trim()}>
                                            <Plus className="w-3 h-3" />
                                          </Button>
                                        </div>
                                        {m.optionals.map(o => (
                                          <div key={o.id} className="flex items-center gap-1 text-xs py-0.5">
                                            <span className="text-muted-foreground">•</span>
                                            {renderEditable("partner_catalog_model_optionals", o.id, o.name, "text-xs")}
                                            <Button size="icon" variant="ghost" className="h-5 w-5 text-destructive shrink-0"
                                              onClick={() => deleteRow("partner_catalog_model_optionals", o.id, o.name)}>
                                              <Trash2 className="w-2.5 h-2.5" />
                                            </Button>
                                          </div>
                                        ))}
                                      </div>

                                      {/* Included items */}
                                      <div className="space-y-1">
                                        <p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                                          <Check className="w-3 h-3" /> Itens inclusos
                                        </p>
                                        <div className="flex items-center gap-1">
                                          <Input value={newIncluded[m.id] || ""} onChange={e => setNewIncluded(p => ({ ...p, [m.id]: e.target.value }))}
                                            placeholder="Novo item incluso" className="h-7 text-xs"
                                            onKeyDown={e => { if (e.key === "Enter") addIncluded(m.id); }} />
                                          <Button size="icon" variant="outline" className="h-7 w-7 shrink-0" onClick={() => addIncluded(m.id)} disabled={!newIncluded[m.id]?.trim()}>
                                            <Plus className="w-3 h-3" />
                                          </Button>
                                        </div>
                                        {m.included.map(i => (
                                          <div key={i.id} className="flex items-center gap-1 text-xs py-0.5">
                                            <span className="text-muted-foreground">•</span>
                                            {renderEditable("partner_catalog_model_included_items", i.id, i.name, "text-xs")}
                                            <Button size="icon" variant="ghost" className="h-5 w-5 text-destructive shrink-0"
                                              onClick={() => deleteRow("partner_catalog_model_included_items", i.id, i.name)}>
                                              <Trash2 className="w-2.5 h-2.5" />
                                            </Button>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
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
    </div>
  );
};

export default MatrizPartnerCatalog;
