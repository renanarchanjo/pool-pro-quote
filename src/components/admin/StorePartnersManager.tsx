import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, Handshake, Image as ImageIcon } from "lucide-react";
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

    if (checked) {
      const { error } = await supabase.from("store_partners").insert({ store_id: store.id, partner_id: partnerId });
      if (error) { toast.error("Erro ao vincular parceiro"); setToggling(null); return; }
      setLinkedIds(prev => new Set([...prev, partnerId]));
      toast.success("Parceiro vinculado!");
    } else {
      const { error } = await supabase.from("store_partners").delete().eq("store_id", store.id).eq("partner_id", partnerId);
      if (error) { toast.error("Erro ao desvincular parceiro"); setToggling(null); return; }
      setLinkedIds(prev => { const n = new Set(prev); n.delete(partnerId); return n; });
      toast.success("Parceiro desvinculado!");
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
          Selecione as marcas parceiras com as quais sua loja trabalha
        </p>
      </div>

      <Card className="p-4 bg-primary/5 border-primary/20">
        <div className="flex items-start gap-3">
          <Handshake className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold text-foreground">Como funciona?</p>
            <p className="text-muted-foreground mt-1">
              Ao marcar uma marca parceira, as propostas geradas para essa marca exibirão automaticamente o banner do parceiro.
              Para marcas não-parceiras, o sistema rotaciona banners dos parceiros ativos com base no ranking.
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
                    <p className="font-medium truncate">{partner.name}</p>
                    <p className="text-xs text-muted-foreground">#{partner.ranking} no ranking</p>
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
