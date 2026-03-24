import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStoreData } from "@/hooks/useStoreData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Download, Search, FileText, Phone, MapPin, Calendar } from "lucide-react";
import { toast } from "sonner";
import html2pdf from "html2pdf.js";

interface Proposal {
  id: string;
  customer_name: string;
  customer_city: string;
  customer_whatsapp: string;
  total_price: number;
  created_at: string;
  selected_optionals: any;
  store_id: string | null;
  pool_models: { name: string } | null;
  stores: { name: string } | null;
}

const ProposalsView = () => {
  const { store } = useStoreData();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [filtered, setFiltered] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (store) loadProposals();
  }, [store]);

  // Realtime: auto-reload when proposals change for this store
  useEffect(() => {
    if (!store) return;
    const channel = supabase
      .channel('proposals-list')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'proposals', filter: `store_id=eq.${store.id}` },
        () => { loadProposals(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [store]);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(proposals);
    } else {
      const q = search.toLowerCase();
      setFiltered(
        proposals.filter(
          (p) =>
            p.customer_name.toLowerCase().includes(q) ||
            p.customer_city.toLowerCase().includes(q) ||
            p.customer_whatsapp.includes(q) ||
            p.pool_models?.name?.toLowerCase().includes(q)
        )
      );
    }
  }, [search, proposals]);

  const loadProposals = async () => {
    if (!store) return;
    try {
      const { data, error } = await supabase
        .from("proposals")
        .select(`
          id, customer_name, customer_city, customer_whatsapp,
          total_price, created_at, selected_optionals, store_id,
          pool_models (name),
          stores (name)
        `)
        .eq("store_id", store.id)
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

  const formatCurrency = (v: number) =>
    `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const totalRevenue = filtered.reduce((s, p) => s + p.total_price, 0);

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    toast.info("Gerando PDF...");
    try {
      await html2pdf()
        .set({
          margin: 10,
          filename: `relatorio-propostas-${new Date().toISOString().split("T")[0]}.pdf`,
          html2canvas: { scale: 2 },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(reportRef.current)
        .save();
      toast.success("PDF exportado com sucesso!");
    } catch {
      toast.error("Erro ao gerar PDF");
    }
  };

  const handleWhatsApp = (p: Proposal) => {
    const msg = encodeURIComponent(
      `Olá ${p.customer_name}! Segue sua proposta:\n\nModelo: ${p.pool_models?.name || "N/A"}\nValor: ${formatCurrency(p.total_price)}\n\nEntre em contato para mais detalhes!`
    );
    const phone = p.customer_whatsapp.replace(/\D/g, "");
    window.open(`https://wa.me/55${phone}?text=${msg}`, "_blank");
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold">Propostas Geradas</h2>
        <Button onClick={handleExportPDF} variant="outline" className="shrink-0">
          <Download className="w-4 h-4 mr-2" />
          Exportar Relatório PDF
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p>
            <p className="text-2xl font-bold">{filtered.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Receita Total</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Ticket Médio</p>
            <p className="text-2xl font-bold">
              {filtered.length > 0 ? formatCurrency(totalRevenue / filtered.length) : "R$ 0,00"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por nome, cidade, WhatsApp ou modelo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Printable report area */}
      <div ref={reportRef}>
        {filtered.length === 0 ? (
          <Card className="p-8 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {search ? "Nenhuma proposta encontrada para esta busca" : "Nenhuma proposta gerada ainda"}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((p) => (
              <Card key={p.id} className="border-border/50 hover:shadow-card transition-shadow">
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-semibold">{p.customer_name}</h3>
                        <Badge variant="secondary" className="text-xs">
                          {p.pool_models?.name || "N/A"}
                        </Badge>
                        {p.stores?.name && (
                          <Badge variant="outline" className="text-xs">
                            {p.stores.name}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" /> {p.customer_city}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" /> {p.customer_whatsapp}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(p.created_at).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <p className="text-xl font-bold text-primary">{formatCurrency(p.total_price)}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleWhatsApp(p)}
                        className="print:hidden"
                      >
                        <Phone className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProposalsView;
