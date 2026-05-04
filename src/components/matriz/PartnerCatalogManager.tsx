import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, Trash2, ChevronDown, ChevronRight, Pencil, Check, X, Package } from "lucide-react";
import { toast } from "sonner";

interface Props {
  partnerId: string;
  partnerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Brand { id: string; name: string; description: string | null; categories: Category[] }
interface Category { id: string; name: string; description: string | null; models: Model[] }
interface Model { id: string; name: string; optionals: SimpleItem[]; included: SimpleItem[] }
interface SimpleItem { id: string; name: string }
interface OptGroup { id: string; name: string; optionals: SimpleItem[] }
interface ItemTmpl { id: string; name: string; items: SimpleItem[] }

interface CatalogJson {
  schema_version: string;
  brands?: Array<{
    name: string; description?: string | null;
    categories?: Array<{
      name: string; description?: string | null;
      models?: Array<any>;
    }>
  }>;
  optional_groups?: Array<any>;
  included_item_templates?: Array<any>;
}

const PartnerCatalogManager = ({ partnerId, partnerName, open, onOpenChange }: Props) => {
  const [loading, setLoading] = useState(true);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [groups, setGroups] = useState<OptGroup[]>([]);
  const [templates, setTemplates] = useState<ItemTmpl[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<{ table: string; id: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<CatalogJson | null>(null);
  const [importMode, setImportMode] = useState<"replace" | "merge" | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) load(); }, [open, partnerId]);

  const load = async () => {
    setLoading(true);
    const [bRes, cRes, mRes, moRes, miRes, gRes, oRes, tRes, tiRes] = await Promise.all([
      supabase.from("partner_catalog_brands").select("id, name, description").eq("partner_id", partnerId).order("display_order"),
      supabase.from("partner_catalog_categories").select("id, name, description, partner_catalog_brand_id, display_order").order("display_order"),
      supabase.from("partner_catalog_models").select("id, name, partner_catalog_category_id, display_order").order("display_order"),
      supabase.from("partner_catalog_model_optionals").select("id, name, partner_catalog_model_id"),
      supabase.from("partner_catalog_model_included_items").select("id, name, partner_catalog_model_id"),
      supabase.from("partner_catalog_optional_groups").select("id, name").eq("partner_id", partnerId).order("display_order"),
      supabase.from("partner_catalog_optionals").select("id, name, partner_catalog_optional_group_id"),
      supabase.from("partner_catalog_item_templates").select("id, name").eq("partner_id", partnerId),
      supabase.from("partner_catalog_item_template_items").select("id, name, partner_catalog_item_template_id"),
    ]);

    const bIds = new Set((bRes.data || []).map((b: any) => b.id));
    const cats = (cRes.data || []).filter((c: any) => bIds.has(c.partner_catalog_brand_id));
    const cIds = new Set(cats.map((c: any) => c.id));
    const models = (mRes.data || []).filter((m: any) => cIds.has(m.partner_catalog_category_id));
    const mIds = new Set(models.map((m: any) => m.id));

    setBrands((bRes.data || []).map((b: any) => ({
      id: b.id, name: b.name, description: b.description,
      categories: cats.filter((c: any) => c.partner_catalog_brand_id === b.id).map((c: any) => ({
        id: c.id, name: c.name, description: c.description,
        models: models.filter((m: any) => m.partner_catalog_category_id === c.id).map((m: any) => ({
          id: m.id, name: m.name,
          optionals: (moRes.data || []).filter((o: any) => o.partner_catalog_model_id === m.id),
          included: (miRes.data || []).filter((i: any) => i.partner_catalog_model_id === m.id),
        })),
      })),
    })));
    setGroups((gRes.data || []).map((g: any) => ({
      id: g.id, name: g.name,
      optionals: (oRes.data || []).filter((o: any) => o.partner_catalog_optional_group_id === g.id),
    })));
    setTemplates((tRes.data || []).map((t: any) => ({
      id: t.id, name: t.name,
      items: (tiRes.data || []).filter((i: any) => i.partner_catalog_item_template_id === t.id),
    })));
    setLoading(false);
  };

  const toggle = (id: string) => setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      const json = JSON.parse(text) as CatalogJson;
      if (!json.schema_version) throw new Error("Arquivo inválido: falta schema_version");
      setImportPreview(json);
      const hasExisting = brands.length > 0 || groups.length > 0 || templates.length > 0;
      setImportMode(hasExisting ? null : "replace");
    } catch (err: any) {
      toast.error("JSON inválido: " + err.message);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const deleteAllCatalog = async () => {
    // Delete cascade: items first, then templates / models / categories / brands / groups
    // brands of this partner
    const { data: bs } = await supabase.from("partner_catalog_brands").select("id").eq("partner_id", partnerId);
    const bIds = (bs || []).map((b: any) => b.id);
    if (bIds.length) {
      const { data: cs } = await supabase.from("partner_catalog_categories").select("id").in("partner_catalog_brand_id", bIds);
      const cIds = (cs || []).map((c: any) => c.id);
      if (cIds.length) {
        const { data: ms } = await supabase.from("partner_catalog_models").select("id").in("partner_catalog_category_id", cIds);
        const mIds = (ms || []).map((m: any) => m.id);
        if (mIds.length) {
          await supabase.from("partner_catalog_model_optionals").delete().in("partner_catalog_model_id", mIds);
          await supabase.from("partner_catalog_model_included_items").delete().in("partner_catalog_model_id", mIds);
          await supabase.from("partner_catalog_models").delete().in("id", mIds);
        }
        await supabase.from("partner_catalog_categories").delete().in("id", cIds);
      }
      await supabase.from("partner_catalog_brands").delete().in("id", bIds);
    }
    const { data: gs } = await supabase.from("partner_catalog_optional_groups").select("id").eq("partner_id", partnerId);
    const gIds = (gs || []).map((g: any) => g.id);
    if (gIds.length) {
      await supabase.from("partner_catalog_optionals").delete().in("partner_catalog_optional_group_id", gIds);
      await supabase.from("partner_catalog_optional_groups").delete().in("id", gIds);
    }
    const { data: ts } = await supabase.from("partner_catalog_item_templates").select("id").eq("partner_id", partnerId);
    const tIds = (ts || []).map((t: any) => t.id);
    if (tIds.length) {
      await supabase.from("partner_catalog_item_template_items").delete().in("partner_catalog_item_template_id", tIds);
      await supabase.from("partner_catalog_item_templates").delete().in("id", tIds);
    }
  };

  const performImport = async () => {
    if (!importPreview || !importMode) return;
    setImporting(true);
    try {
      if (importMode === "replace") {
        await deleteAllCatalog();
      }
      // Insert brands
      for (const b of importPreview.brands || []) {
        const { data: nb, error } = await supabase.from("partner_catalog_brands")
          .insert({ partner_id: partnerId, name: b.name, description: b.description || null }).select("id").single();
        if (error) throw error;
        let cOrder = 0;
        for (const c of b.categories || []) {
          const { data: nc, error: cE } = await supabase.from("partner_catalog_categories")
            .insert({ partner_catalog_brand_id: nb.id, name: c.name, description: c.description || null, display_order: cOrder++ }).select("id").single();
          if (cE) throw cE;
          let mOrder = 0;
          for (const m of c.models || []) {
            const { data: nm, error: mE } = await supabase.from("partner_catalog_models").insert({
              partner_catalog_category_id: nc.id, name: m.name,
              length: m.length, width: m.width, depth: m.depth,
              delivery_days: m.delivery_days, installation_days: m.installation_days,
              payment_terms: m.payment_terms, notes: m.notes, photo_url: m.photo_url,
              differentials: m.differentials || [], included_items: m.included_items || [],
              not_included_items: m.not_included_items || [],
              display_order: m.display_order ?? mOrder++,
            }).select("id").single();
            if (mE) throw mE;
            if (m.optionals?.length) {
              await supabase.from("partner_catalog_model_optionals").insert(m.optionals.map((o: any, idx: number) => ({
                partner_catalog_model_id: nm.id, name: o.name, description: o.description || null,
                item_type: o.item_type || "material", display_order: o.display_order ?? idx,
              })));
            }
            if (m.included_item_entries?.length) {
              await supabase.from("partner_catalog_model_included_items").insert(m.included_item_entries.map((i: any, idx: number) => ({
                partner_catalog_model_id: nm.id, name: i.name, quantity: i.quantity ?? 1,
                item_type: i.item_type || "material", display_order: i.display_order ?? idx,
              })));
            }
          }
        }
      }
      let gOrder = 0;
      for (const g of importPreview.optional_groups || []) {
        const { data: ng, error: gE } = await supabase.from("partner_catalog_optional_groups").insert({
          partner_id: partnerId, name: g.name, description: g.description || null,
          selection_type: g.selection_type || "multiple", display_order: g.display_order ?? gOrder++,
        }).select("id").single();
        if (gE) throw gE;
        if (g.optionals?.length) {
          await supabase.from("partner_catalog_optionals").insert(g.optionals.map((o: any, idx: number) => ({
            partner_catalog_optional_group_id: ng.id, name: o.name, description: o.description || null,
            warning_note: o.warning_note || null, display_order: o.display_order ?? idx,
          })));
        }
      }
      for (const t of importPreview.included_item_templates || []) {
        const { data: nt, error: tE } = await supabase.from("partner_catalog_item_templates").insert({
          partner_id: partnerId, name: t.name, not_included_items: t.not_included_items || [],
        }).select("id").single();
        if (tE) throw tE;
        if (t.items?.length) {
          await supabase.from("partner_catalog_item_template_items").insert(t.items.map((i: any, idx: number) => ({
            partner_catalog_item_template_id: nt.id, name: i.name, quantity: i.quantity ?? 1,
            item_type: i.item_type || "material", display_order: i.display_order ?? idx,
          })));
        }
      }
      toast.success("Catálogo importado!");
      setImportPreview(null); setImportMode(null);
      await load();
    } catch (e: any) {
      toast.error("Erro ao importar: " + e.message);
    } finally {
      setImporting(false);
    }
  };

  const saveEdit = async (table: string, id: string) => {
    const { error } = await supabase.from(table as any).update({ name: editValue }).eq("id", id);
    if (error) { toast.error("Erro ao salvar"); return; }
    setEditing(null); setEditValue("");
    await load();
  };

  const deleteRow = async (table: string, id: string, label: string) => {
    if (!confirm(`Remover "${label}"?`)) return;
    const { error } = await supabase.from(table as any).delete().eq("id", id);
    if (error) { toast.error("Erro ao remover"); return; }
    await load();
  };

  const deleteAll = async () => {
    if (!confirm("Apagar TODO o catálogo padrão deste parceiro?")) return;
    await deleteAllCatalog();
    toast.success("Catálogo removido");
    await load();
  };

  const importStats = importPreview ? {
    brands: importPreview.brands?.length || 0,
    models: (importPreview.brands || []).reduce((s, b) => s + (b.categories || []).reduce((sc, c) => sc + ((c.models || []).length), 0), 0),
    optionals: (importPreview.optional_groups || []).reduce((s, g: any) => s + (g.optionals?.length || 0), 0),
    templates: importPreview.included_item_templates?.length || 0,
  } : null;

  const renderEditable = (table: string, id: string, name: string) => {
    if (editing?.table === table && editing.id === id) {
      return (
        <div className="flex items-center gap-1 flex-1">
          <Input value={editValue} onChange={e => setEditValue(e.target.value)} className="h-7 text-sm" autoFocus />
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveEdit(table, id)}><Check className="w-3.5 h-3.5" /></Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(null)}><X className="w-3.5 h-3.5" /></Button>
        </div>
      );
    }
    return (
      <span className="flex-1 truncate">{name}
        <Button size="icon" variant="ghost" className="h-6 w-6 ml-1 opacity-50 hover:opacity-100"
          onClick={() => { setEditing({ table, id }); setEditValue(name); }}><Pencil className="w-3 h-3" /></Button>
      </span>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Package className="w-5 h-5" /> Catálogo Padrão — {partnerName}</DialogTitle>
          <DialogDescription>Estrutura padrão importada automaticamente quando um lojista vincular este parceiro.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 flex-wrap">
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={handleFile} />
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} className="gap-2">
            <Upload className="w-4 h-4" /> Importar Catálogo (JSON)
          </Button>
          {(brands.length > 0 || groups.length > 0 || templates.length > 0) && (
            <Button size="sm" variant="destructive" onClick={deleteAll} className="gap-2">
              <Trash2 className="w-4 h-4" /> Apagar tudo
            </Button>
          )}
        </div>

        <div className="overflow-y-auto flex-1 space-y-4 pr-2">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : brands.length === 0 && groups.length === 0 && templates.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Nenhum catálogo padrão. Use "Importar Catálogo" para começar.</p>
          ) : (
            <>
              {brands.length > 0 && (
                <div className="space-y-1">
                  <h3 className="text-xs font-bold uppercase text-muted-foreground">Marcas</h3>
                  {brands.map(b => (
                    <div key={b.id} className="border rounded-lg">
                      <div className="flex items-center gap-1 p-2 bg-muted/50">
                        <button onClick={() => toggle(b.id)}>{expanded.has(b.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</button>
                        {renderEditable("partner_catalog_brands", b.id, b.name)}
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteRow("partner_catalog_brands", b.id, b.name)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                      {expanded.has(b.id) && (
                        <div className="pl-6 pr-2 pb-2 space-y-1">
                          {b.categories.map(c => (
                            <div key={c.id} className="border-l-2 border-border pl-2">
                              <div className="flex items-center gap-1 py-1">
                                <button onClick={() => toggle(c.id)}>{expanded.has(c.id) ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}</button>
                                {renderEditable("partner_catalog_categories", c.id, c.name)}
                                <span className="text-[10px] text-muted-foreground">{c.models.length} modelo(s)</span>
                                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => deleteRow("partner_catalog_categories", c.id, c.name)}><Trash2 className="w-3 h-3" /></Button>
                              </div>
                              {expanded.has(c.id) && (
                                <div className="pl-4 space-y-1">
                                  {c.models.map(m => (
                                    <div key={m.id} className="border-l border-border pl-2">
                                      <div className="flex items-center gap-1 py-1">
                                        <button onClick={() => toggle(m.id)}>{expanded.has(m.id) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}</button>
                                        {renderEditable("partner_catalog_models", m.id, m.name)}
                                        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => deleteRow("partner_catalog_models", m.id, m.name)}><Trash2 className="w-3 h-3" /></Button>
                                      </div>
                                      {expanded.has(m.id) && (
                                        <div className="pl-4 text-xs space-y-0.5 pb-1">
                                          {m.optionals.length > 0 && <div className="text-muted-foreground">Opcionais: {m.optionals.map(o => o.name).join(", ")}</div>}
                                          {m.included.length > 0 && <div className="text-muted-foreground">Inclusos: {m.included.map(i => i.name).join(", ")}</div>}
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

              {groups.length > 0 && (
                <div className="space-y-1">
                  <h3 className="text-xs font-bold uppercase text-muted-foreground">Grupos de Opcionais</h3>
                  {groups.map(g => (
                    <div key={g.id} className="border rounded-lg p-2">
                      <div className="flex items-center gap-1">
                        {renderEditable("partner_catalog_optional_groups", g.id, g.name)}
                        <span className="text-[10px] text-muted-foreground">{g.optionals.length}</span>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => deleteRow("partner_catalog_optional_groups", g.id, g.name)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                      {g.optionals.length > 0 && <div className="text-xs text-muted-foreground pl-2 mt-1">{g.optionals.map(o => o.name).join(", ")}</div>}
                    </div>
                  ))}
                </div>
              )}

              {templates.length > 0 && (
                <div className="space-y-1">
                  <h3 className="text-xs font-bold uppercase text-muted-foreground">Templates de Itens Inclusos</h3>
                  {templates.map(t => (
                    <div key={t.id} className="border rounded-lg p-2">
                      <div className="flex items-center gap-1">
                        {renderEditable("partner_catalog_item_templates", t.id, t.name)}
                        <span className="text-[10px] text-muted-foreground">{t.items.length}</span>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => deleteRow("partner_catalog_item_templates", t.id, t.name)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                      {t.items.length > 0 && <div className="text-xs text-muted-foreground pl-2 mt-1">{t.items.map(i => i.name).join(", ")}</div>}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Import confirmation */}
        {importPreview && importStats && (
          <div className="border-t pt-3 space-y-3 bg-muted/30 -mx-6 px-6 -mb-6 pb-4">
            <div className="text-sm">
              <p className="font-semibold">Confirmar importação</p>
              <p className="text-muted-foreground text-xs mt-1">
                {importStats.brands} marcas, {importStats.models} modelos, {importStats.optionals} opcionais, {importStats.templates} templates
              </p>
            </div>
            {(brands.length > 0 || groups.length > 0 || templates.length > 0) && !importMode && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setImportMode("merge")}>Mesclar</Button>
                <Button size="sm" variant="destructive" onClick={() => setImportMode("replace")}>Substituir tudo</Button>
              </div>
            )}
            {importMode && (
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="ghost" onClick={() => { setImportPreview(null); setImportMode(null); }}>Cancelar</Button>
                <Button size="sm" onClick={performImport} disabled={importing}>
                  {importing && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                  Confirmar ({importMode === "replace" ? "substituir" : "mesclar"})
                </Button>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PartnerCatalogManager;
