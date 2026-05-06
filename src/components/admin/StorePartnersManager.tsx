import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Handshake, Image as ImageIcon, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useStoreData } from "@/hooks/useStoreData";

interface Partner {
  id: string;
  name: string;
  logo_url: string | null;
  active: boolean;
  ranking: number;
}

const StorePartnersManager = () => {
  const { store } = useStoreData();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [linkedIds, setLinkedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);

  const handleSync = async (partnerId: string, partnerName: string) => {
    if (!store?.id) return;
    setSyncing(partnerId);
    try {
      toast.loading(`Atualizando catálogo de ${partnerName}...`, { id: "sync-cat" });
      const { data, error } = await supabase.functions.invoke("apply-partner-catalog", {
        body: { store_id: store.id, partner_id: partnerId, mode: "sync" },
      });
      if (error) throw error;
      const s = data?.summary || {};
      const total = (s.addedBrands || 0) + (s.addedCategories || 0) + (s.addedModels || 0) + (s.addedOptionalGroups || 0) + (s.addedTemplates || 0);
      if (total === 0) {
        toast.success("Catálogo já está atualizado — nenhum item novo.", { id: "sync-cat" });
      } else {
        toast.success(`Atualização concluída: ${s.addedModels || 0} novos modelos, ${s.addedCategories || 0} categorias, ${s.addedBrands || 0} marcas adicionadas.`, { id: "sync-cat" });
      }
    } catch (e: any) {
      toast.error("Falha ao atualizar: " + (e?.message || "erro"), { id: "sync-cat" });
    } finally {
      setSyncing(null);
    }
  };

  useEffect(() => {
    if (store?.id) loadData();
  }, [store?.id]);

  const loadData = async () => {
    const [partnersRes, linksRes] = await Promise.all([
      supabase.from("partners").select("id, name, logo_url, active, ranking").eq("active", true).order("ranking", { ascending: true }),
      supabase.from("store_partners").select("partner_id").eq("store_id", store!.id),
    ]);

    if (partnersRes.error) { toast.error("Erro ao carregar parceiros"); console.error(partnersRes.error); }
    else { setPartners((partnersRes.data as Partner[]) || []); }

    if (linksRes.error) { console.error(linksRes.error); }
    else { setLinkedIds(new Set((linksRes.data || []).map((l: any) => l.partner_id))); }

    setLoading(false);
  };

  const handleToggle = async (partnerId: string, checked: boolean) => {
    if (!store?.id) return;
    setToggling(partnerId);

    const partner = partners.find(p => p.id === partnerId);
    if (!partner) { setToggling(null); return; }

    if (checked) {
      // 1. Link the partner
      const { error: linkError } = await supabase.from("store_partners").insert({ store_id: store.id, partner_id: partnerId });
      if (linkError) { toast.error("Erro ao vincular parceiro"); setToggling(null); return; }

      // 2. Apply partner standard catalog (if any) via edge function
      try {
        toast.loading("Importando catálogo padrão do parceiro...", { id: "apply-cat" });
        const { data, error: fnErr } = await supabase.functions.invoke("apply-partner-catalog", {
          body: { store_id: store.id, partner_id: partnerId },
        });
        if (fnErr) throw fnErr;
        if (data?.applied) {
          const s = data.summary || {};
          toast.success(`Catálogo importado: ${s.insertedBrands || 0} marcas, ${s.insertedModels || 0} modelos`, { id: "apply-cat" });
        } else {
          // Fallback: ensure brand exists for catalog
          const { data: existingBrand } = await supabase.from("brands").select("id").eq("store_id", store.id).eq("name", partner.name).maybeSingle();
          if (existingBrand) {
            await supabase.from("brands").update({ active: true, logo_url: partner.logo_url, partner_id: partnerId } as any).eq("id", existingBrand.id);
          } else {
            await supabase.from("brands").insert({ name: partner.name, store_id: store.id, logo_url: partner.logo_url, active: true, partner_id: partnerId } as any);
          }
          toast.success(`Parceiro "${partner.name}" vinculado!`, { id: "apply-cat" });
        }
      } catch (e: any) {
        toast.error("Vinculado, mas falha ao importar catálogo: " + (e?.message || "erro"), { id: "apply-cat" });
      }

      setLinkedIds(prev => new Set([...prev, partnerId]));
    } else {
      // Unlink - remove the partner catalog (brands/categories/models/optionals/templates) to avoid duplicates on re-link
      try {
        toast.loading("Removendo catálogo do parceiro...", { id: "remove-cat" });
        const { error: fnErr } = await supabase.functions.invoke("apply-partner-catalog", {
          body: { store_id: store.id, partner_id: partnerId, mode: "remove" },
        });
        if (fnErr) throw fnErr;
      } catch (e: any) {
        toast.error("Falha ao remover catálogo: " + (e?.message || "erro"), { id: "remove-cat" });
        setToggling(null);
        return;
      }
      const { error } = await supabase.from("store_partners").delete().eq("store_id", store.id).eq("partner_id", partnerId);
      if (error) { toast.error("Erro ao desvincular parceiro"); setToggling(null); return; }
      setLinkedIds(prev => { const n = new Set(prev); n.delete(partnerId); return n; });
      toast.success("Parceiro desvinculado e catálogo removido.", { id: "remove-cat" });
    }
    setToggling(null);
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
        <h1 className="text-3xl font-bold">Marcas Parceiras</h1>
        <p className="text-muted-foreground mt-1">
          Selecione as marcas parceiras — o catálogo (marca + categorias) será criado automaticamente
        </p>
      </div>

      <Card className="p-4 bg-primary/5 border-primary/20">
        <div className="flex items-start gap-3">
          <Handshake className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold text-foreground">Como funciona?</p>
            <p className="text-muted-foreground mt-1">
              Ao marcar um parceiro, a <strong>Marca</strong> é criada automaticamente no seu catálogo.
              Você fica livre para criar <strong>categorias, modelos, opcionais e preços</strong> dentro dessa marca.
            </p>
            <p className="text-muted-foreground mt-1">
              Propostas geradas para marcas parceiras exibirão automaticamente o banner do parceiro.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">
          Parceiros Disponíveis ({partners.length})
        </h2>

        {partners.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nenhum parceiro disponível no momento.
          </p>
        ) : (
          <div className="space-y-2">
            {partners.map((partner) => {
              const isLinked = linkedIds.has(partner.id);
              return (
                <div
                  key={partner.id}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                    isLinked ? "bg-primary/5 border-primary/30" : "bg-background border-border/50 hover:bg-muted/50"
                  }`}
                >
                  <label className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer">
                    <Checkbox
                      checked={isLinked}
                      disabled={toggling === partner.id}
                      onCheckedChange={(checked) => handleToggle(partner.id, !!checked)}
                    />
                    <div className="w-10 h-10 rounded-lg bg-background border border-border/50 flex items-center justify-center overflow-hidden p-1 shrink-0">
                      {partner.logo_url ? (
                        <img src={partner.logo_url} alt={partner.name} className="max-w-full max-h-full object-contain" />
                      ) : (
                        <ImageIcon className="w-4 h-4 text-muted-foreground/40" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{partner.name}</p>
                        {isLinked && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground">#{partner.ranking} no ranking</p>
                    </div>
                  </label>
                  {toggling === partner.id && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                  {isLinked && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleSync(partner.id, partner.name)}
                      disabled={syncing === partner.id || toggling === partner.id}
                      className="shrink-0"
                      title="Importar novos modelos da Matriz sem apagar suas edições"
                    >
                      {syncing === partner.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      <span className="ml-1.5">Atualizar</span>
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default StorePartnersManager;
