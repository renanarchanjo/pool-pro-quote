import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, Trash2, ArrowLeft, ChevronRight, ChevronDown, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";

interface PartnerCatalogTree {
  brands: Array<{
    id: string;
    name: string;
    description: string | null;
    categories: Array<{
      id: string;
      name: string;
      description: string | null;
      models: Array<{
        id: string;
        name: string;
        length: number | null;
        width: number | null;
        depth: number | null;
        optionals_count: number;
        included_count: number;
      }>;
    }>;
  }>;
  optional_groups_count: number;
  optionals_count: number;
  templates_count: number;
}

const PartnerCatalog = () => {
  const { partnerId } = useParams<{ partnerId: string }>();
  const navigate = useNavigate();
  const [partnerName, setPartnerName] = useState("");
  const [tree, setTree] = useState<PartnerCatalogTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [pendingImport, setPendingImport] = useState<{ json: any; counts: { brands: number; categories: number; models: number; optionals: number } } | null>(null);
  const [hasExisting, setHasExisting] = useState(false);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => { if (partnerId) load(); }, [partnerId]);

  const load = async () => {
    if (!partnerId) return;
    setLoading(true);
    const [partnerRes, brandsRes, catsRes, modelsRes, modelOptsRes, modelInclRes, groupsRes, optsRes, tplsRes] = await Promise.all([
      supabase.from("partners").select("name").eq("id", partnerId).maybeSingle(),
      supabase.from("partner_catalog_brands").select("*").eq("partner_id", partnerId).order("display_order"),
      supabase.from("partner_catalog_categories").select("*").order("display_order"),
      supabase.from("partner_catalog_models").select("*").order("display_order"),
      supabase.from("partner_catalog_model_optionals").select("partner_catalog_model_id"),
      supabase.from("partner_catalog_model_included_items").select("partner_catalog_model_id"),
      supabase.from("partner_catalog_optional_groups").select("id").eq("partner_id", partnerId),
      supabase.from("partner_catalog_optionals").select("id, partner_catalog_optional_group_id"),
      supabase.from("partner_catalog_item_templates").select("id").eq("partner_id", partnerId),
    ]);
    setPartnerName(partnerRes.data?.name || "Parceiro");

    const brands = brandsRes.data || [];
    const cats = catsRes.data || [];
    const models = modelsRes.data || [];
    const optsByModel = new Map<string, number>();
    for (const o of modelOptsRes.data || []) optsByModel.set(o.partner_catalog_model_id, (optsByModel.get(o.partner_catalog_model_id) || 0) + 1);
    const inclByModel = new Map<string, number>();
    for (const i of modelInclRes.data || []) inclByModel.set(i.partner_catalog_model_id, (inclByModel.get(i.partner_catalog_model_id) || 0) + 1);
    const groupIds = new Set((groupsRes.data || []).map((g: any) => g.id));
    const optsCount = (optsRes.data || []).filter((o: any) => groupIds.has(o.partner_catalog_optional_group_id)).length;

    const built: PartnerCatalogTree = {
      brands: brands.map(b => ({
        id: b.id, name: b.name, description: b.description,
        categories: cats.filter(c => c.partner_catalog_brand_id === b.id).map(c => ({
          id: c.id, name: c.name, description: c.description,
          models: models.filter(m => m.partner_catalog_category_id === c.id).map(m => ({
            id: m.id, name: m.name, length: m.length, width: m.width, depth: m.depth,
            optionals_count: optsByModel.get(m.id) || 0,
            included_count: inclByModel.get(m.id) || 0,
          })),
        })),
      })),
      optional_groups_count: groupIds.size,
      optionals_count: optsCount,
      templates_count: (tplsRes.data || []).length,
    };
    setTree(built);
    setHasExisting(brands.length > 0);
    setLoading(false);
  };

  const handleFile = async (file: File) => {
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (!json.schema_version) { toast.error("Arquivo inválido: sem schema_version"); return; }
      const counts = {
        brands: json.brands?.length || 0,
        categories: (json.brands || []).reduce((s: number, b: any) => s + (b.categories?.length || 0), 0),
        models: (json.brands || []).reduce((s: number, b: any) => s + (b.categories || []).reduce((s2: number, c: any) => s2 + (c.models?.length || 0), 0), 0),
        optionals: (json.optional_groups || []).reduce((s: number, g: any) => s + (g.optionals?.length || 0), 0),
      };
      setPendingImport({ json, counts });
    } catch (e: any) {
      toast.error("JSON inválido: " + (e?.message || "erro"));
    }
  };

  const performImport = async (replace: boolean) => {
    if (!pendingImport || !partnerId) return;
    setImporting(true);
    try {
      if (replace) {
        // Delete all existing partner catalog rows (cascades take care of children)
        await Promise.all([
          supabase.from("partner_catalog_brands").delete().eq("partner_id", partnerId),
          supabase.from("partner_catalog_optional_groups").delete().eq("partner_id", partnerId),
          supabase.from("partner_catalog_item_templates").delete().eq("partner_id", partnerId),
        ]);
      }

      const { json } = pendingImport;
      // Brands → Categories → Models → Optionals/Included
      for (const b of json.brands || []) {
        const { data: brandIns, error: be } = await supabase.from("partner_catalog_brands")
          .insert({ partner_id: partnerId, name: b.name, description: b.description || null }).select("id").single();
        if (be) throw be;
        for (const c of b.categories || []) {
          const { data: catIns, error: ce } = await supabase.from("partner_catalog_categories")
            .insert({ partner_catalog_brand_id: brandIns.id, name: c.name, description: c.description || null, display_order: c.display_order || 0 }).select("id").single();
          if (ce) throw ce;
          for (const m of c.models || []) {
            const { data: modelIns, error: me } = await supabase.from("partner_catalog_models").insert({
              partner_catalog_category_id: catIns.id,
              name: m.name, length: m.length, width: m.width, depth: m.depth,
              delivery_days: m.delivery_days || 30, installation_days: m.installation_days || 5,
              payment_terms: m.payment_terms || "À vista", notes: m.notes,
              photo_url: m.photo_url, differentials: m.differentials || [],
              included_items: m.included_items || [], not_included_items: m.not_included_items || [],
              display_order: m.display_order || 0,
            }).select("id").single();
            if (me) throw me;
            for (const o of m.optionals || []) {
              await supabase.from("partner_catalog_model_optionals").insert({
                partner_catalog_model_id: modelIns.id, name: o.name, description: o.description || null,
                item_type: o.item_type || "material",
              });
            }
            for (const i of m.included_items_detail || []) {
              await supabase.from("partner_catalog_model_included_items").insert({
                partner_catalog_model_id: modelIns.id, name: i.name, quantity: i.quantity || 1,
                item_type: i.item_type || "material", display_order: i.display_order || 0,
              });
            }
          }
        }
      }
      for (const g of json.optional_groups || []) {
        const { data: gIns, error: ge } = await supabase.from("partner_catalog_optional_groups").insert({
          partner_id: partnerId, name: g.name, description: g.description, selection_type: g.selection_type || "multiple",
        }).select("id").single();
        if (ge) throw ge;
        for (const o of g.optionals || []) {
          await supabase.from("partner_catalog_optionals").insert({
            partner_catalog_optional_group_id: gIns.id, name: o.name, description: o.description,
            warning_note: o.warning_note, item_type: o.item_type || "material",
          });
        }
      }
      for (const t of json.item_templates || []) {
        const { data: tIns, error: te } = await supabase.from("partner_catalog_item_templates").insert({
          partner_id: partnerId, name: t.name, not_included_items: t.not_included_items || [],
        }).select("id").single();
        if (te) throw te;
        for (const i of t.items || []) {
          await supabase.from("partner_catalog_item_template_items").insert({
            partner_catalog_item_template_id: tIns.id, name: i.name, quantity: i.quantity || 1,
            item_type: i.item_type || "material", display_order: i.display_order || 0,
          });
        }
      }
      toast.success("Catálogo importado!");
      setPendingImport(null);
      load();
    } catch (e: any) {
      toast.error("Erro ao importar: " + (e?.message || "desconhecido"));
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!partnerId) return;
    setConfirmDeleteAll(false);
    await Promise.all([
      supabase.from("partner_catalog_brands").delete().eq("partner_id", partnerId),
      supabase.from("partner_catalog_optional_groups").delete().eq("partner_id", partnerId),
      supabase.from("partner_catalog_item_templates").delete().eq("partner_id", partnerId),
    ]);
    toast.success("Catálogo do parceiro removido");
    load();
  };

  const toggle = (id: string) => {
    setExpanded(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/matriz/parceiros")}><ArrowLeft className="w-4 h-4 mr-1" /> Parceiros</Button>
        <div>
          <h1 className="text-[18px] font-semibold">Catálogo Padrão — {partnerName}</h1>
          <p className="text-[13px] text-muted-foreground">Modelo replicado para qualquer lojista que ativar este parceiro.</p>
        </div>
      </div>

      <Card className="p-4 flex flex-wrap items-center gap-3">
        <input type="file" accept=".json,application/json" id="catalog-file" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
        <Button onClick={() => document.getElementById("catalog-file")?.click()} className="gap-2 gradient-primary text-white">
          <Upload className="w-4 h-4" /> Importar Catálogo (JSON)
        </Button>
        {hasExisting && (
          <Button variant="outline" className="gap-2 text-destructive hover:text-destructive" onClick={() => setConfirmDeleteAll(true)}>
            <Trash2 className="w-4 h-4" /> Deletar Catálogo
          </Button>
        )}
        {tree && (
          <span className="text-xs text-muted-foreground ml-auto">
            {tree.brands.length} marca(s) · {tree.brands.reduce((s, b) => s + b.categories.length, 0)} categoria(s) ·{" "}
            {tree.brands.reduce((s, b) => s + b.categories.reduce((s2, c) => s2 + c.models.length, 0), 0)} modelo(s) ·{" "}
            {tree.optionals_count} opcional(is) · {tree.templates_count} template(s)
          </span>
        )}
      </Card>

      {!hasExisting ? (
        <Card className="p-12 text-center text-muted-foreground">
          <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-amber-500" />
          <p className="font-medium">Nenhum catálogo padrão configurado</p>
          <p className="text-sm mt-1">Importe um arquivo JSON exportado de uma loja para começar.</p>
        </Card>
      ) : (
        <Card className="p-4">
          <div className="space-y-2">
            {tree?.brands.map(b => (
              <div key={b.id} className="border border-border rounded-lg">
                <button onClick={() => toggle(b.id)} className="w-full flex items-center gap-2 p-3 hover:bg-muted/50 text-left">
                  {expanded.has(b.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <span className="font-semibold flex-1">{b.name}</span>
                  <span className="text-xs text-muted-foreground">{b.categories.length} categoria(s)</span>
                </button>
                {expanded.has(b.id) && (
                  <div className="border-t border-border p-3 space-y-2">
                    {b.categories.map(c => (
                      <div key={c.id} className="ml-4 border-l-2 border-border pl-3">
                        <button onClick={() => toggle(c.id)} className="w-full flex items-center gap-2 py-1 hover:bg-muted/50 text-left">
                          {expanded.has(c.id) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                          <span className="text-sm font-medium flex-1">{c.name}</span>
                          <span className="text-[11px] text-muted-foreground">{c.models.length} modelo(s)</span>
                        </button>
                        {expanded.has(c.id) && (
                          <div className="ml-5 mt-1 space-y-1">
                            {c.models.map(m => (
                              <div key={m.id} className="text-xs flex items-center gap-2 py-1 text-muted-foreground">
                                <span className="font-medium text-foreground">{m.name}</span>
                                {m.length && m.width && <span>· {m.length}×{m.width}{m.depth ? `×${m.depth}` : ""}m</span>}
                                <span>· {m.optionals_count} opcionais</span>
                                <span>· {m.included_count} itens</span>
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
        </Card>
      )}

      {/* Import confirmation dialog */}
      <Dialog open={!!pendingImport} onOpenChange={(o) => !o && setPendingImport(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Importação</DialogTitle>
            <DialogDescription>
              {pendingImport && (
                <>Encontramos <strong>{pendingImport.counts.brands}</strong> marca(s),{" "}
                <strong>{pendingImport.counts.categories}</strong> categoria(s),{" "}
                <strong>{pendingImport.counts.models}</strong> modelo(s) e{" "}
                <strong>{pendingImport.counts.optionals}</strong> opcional(is).</>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPendingImport(null)} disabled={importing}>Cancelar</Button>
            {hasExisting && (
              <Button variant="outline" onClick={() => performImport(false)} disabled={importing}>
                {importing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Mesclar
              </Button>
            )}
            <Button onClick={() => performImport(true)} disabled={importing} className="gradient-primary text-white">
              {importing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {hasExisting ? "Substituir" : "Importar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDeleteAll} onOpenChange={setConfirmDeleteAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar catálogo deste parceiro?</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as marcas, categorias, modelos, opcionais e templates do catálogo padrão serão removidos.
              Lojistas que já receberam este catálogo NÃO serão afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Deletar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PartnerCatalog;
