import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Handshake, Image as ImageIcon, Tag, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useStoreData } from "@/hooks/useStoreData";

interface Partner {
  id: string;
  name: string;
  logo_url: string | null;
  active: boolean;
  ranking: number;
}

interface PartnerCategory {
  id: string;
  partner_id: string;
  name: string;
  display_order: number;
}

const StorePartnersManager = () => {
  const { store } = useStoreData();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [partnerCategories, setPartnerCategories] = useState<Record<string, PartnerCategory[]>>({});
  const [linkedIds, setLinkedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    if (store?.id) loadData();
  }, [store?.id]);

  const loadData = async () => {
    const [partnersRes, linksRes, catsRes] = await Promise.all([
      supabase.from("partners").select("id, name, logo_url, active, ranking").eq("active", true).order("ranking", { ascending: true }),
      supabase.from("store_partners").select("partner_id").eq("store_id", store!.id),
      supabase.from("partner_categories").select("*").order("display_order", { ascending: true }),
    ]);

    if (partnersRes.error) { toast.error("Erro ao carregar parceiros"); console.error(partnersRes.error); }
    else { setPartners((partnersRes.data as Partner[]) || []); }

    if (linksRes.error) { console.error(linksRes.error); }
    else { setLinkedIds(new Set((linksRes.data || []).map((l: any) => l.partner_id))); }

    if (!catsRes.error && catsRes.data) {
      const grouped: Record<string, PartnerCategory[]> = {};
      for (const cat of catsRes.data as PartnerCategory[]) {
        if (!grouped[cat.partner_id]) grouped[cat.partner_id] = [];
        grouped[cat.partner_id].push(cat);
      }
      setPartnerCategories(grouped);
    }

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

      // 2. Create brand for this store if it doesn't exist
      const { data: existingBrand } = await supabase
        .from("brands")
        .select("id")
        .eq("store_id", store.id)
        .eq("name", partner.name)
        .maybeSingle();

      let brandId: string;

      if (existingBrand) {
        brandId = existingBrand.id;
        // Re-activate if it was inactive
        await supabase.from("brands").update({ active: true, logo_url: partner.logo_url }).eq("id", brandId);
      } else {
        const { data: newBrand, error: brandError } = await supabase
          .from("brands")
          .insert({ name: partner.name, store_id: store.id, logo_url: partner.logo_url, active: true })
          .select("id")
          .single();
        if (brandError) { console.error("Erro ao criar marca:", brandError); }
        brandId = newBrand?.id || "";
      }

      // 3. Create categories for this brand
      if (brandId) {
        const partnerCats = partnerCategories[partnerId] || [];
        for (const cat of partnerCats) {
          const { data: existingCat } = await supabase
            .from("categories")
            .select("id")
            .eq("store_id", store.id)
            .eq("brand_id", brandId)
            .eq("name", cat.name)
            .maybeSingle();

          if (!existingCat) {
            await supabase.from("categories").insert({
              name: cat.name,
              store_id: store.id,
              brand_id: brandId,
              active: true,
            });
          } else {
            // Re-activate
            await supabase.from("categories").update({ active: true }).eq("id", existingCat.id);
          }
        }
      }

      setLinkedIds(prev => new Set([...prev, partnerId]));
      toast.success(`Parceiro "${partner.name}" vinculado! Marca e categorias criadas no catálogo.`);
    } else {
      // Unlink - just remove the store_partners link, keep catalog data
      const { error } = await supabase.from("store_partners").delete().eq("store_id", store.id).eq("partner_id", partnerId);
      if (error) { toast.error("Erro ao desvincular parceiro"); setToggling(null); return; }
      setLinkedIds(prev => { const n = new Set(prev); n.delete(partnerId); return n; });
      toast.success("Parceiro desvinculado! Os dados do catálogo foram mantidos.");
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
              Ao marcar um parceiro, a <strong>Marca</strong> e suas <strong>Categorias</strong> são criadas automaticamente no seu catálogo.
              Você fica livre para cadastrar <strong>modelos, opcionais e preços</strong> dentro dessas categorias.
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
              const cats = partnerCategories[partner.id] || [];
              return (
                <label
                  key={partner.id}
                  className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all hover:bg-muted/50 ${
                    isLinked ? "bg-primary/5 border-primary/30" : "bg-background border-border/50"
                  }`}
                >
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
                    {cats.length > 0 && (
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        <Tag className="w-3 h-3 text-muted-foreground shrink-0" />
                        {cats.map((cat, i) => (
                          <span key={cat.id} className="text-xs text-muted-foreground">
                            {cat.name}{i < cats.length - 1 ? "," : ""}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {toggling === partner.id && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                </label>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default StorePartnersManager;
