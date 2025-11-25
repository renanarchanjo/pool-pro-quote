import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Proposal {
  id: string;
  customer_name: string;
  customer_city: string;
  customer_whatsapp: string;
  total_price: number;
  created_at: string;
  pool_models: {
    name: string;
  } | null;
}

const ProposalsView = () => {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProposals();
  }, []);

  const loadProposals = async () => {
    try {
      const { data, error } = await supabase
        .from("proposals")
        .select(`
          id,
          customer_name,
          customer_city,
          customer_whatsapp,
          total_price,
          created_at,
          pool_models (name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProposals(data || []);
    } catch (error) {
      console.error("Error loading proposals:", error);
      toast.error("Erro ao carregar propostas");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (proposals.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Nenhuma proposta gerada ainda</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">Propostas Geradas</h2>
      {proposals.map((proposal) => (
        <Card key={proposal.id} className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-semibold">{proposal.customer_name}</h3>
              <p className="text-muted-foreground">{proposal.customer_city}</p>
            </div>
            <Badge>
              {new Date(proposal.created_at).toLocaleDateString('pt-BR')}
            </Badge>
          </div>

          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-semibold">WhatsApp:</span>
              <p className="text-muted-foreground">{proposal.customer_whatsapp}</p>
            </div>
            <div>
              <span className="font-semibold">Modelo:</span>
              <p className="text-muted-foreground">
                {proposal.pool_models?.name || "N/A"}
              </p>
            </div>
            <div>
              <span className="font-semibold">Valor Total:</span>
              <p className="text-xl font-bold text-primary">
                R$ {proposal.total_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default ProposalsView;
