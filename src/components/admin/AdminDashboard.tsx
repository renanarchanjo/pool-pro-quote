import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Download } from "lucide-react";
import { useStoreData } from "@/hooks/useStoreData";
import { toast } from "sonner";
import html2pdf from "html2pdf.js";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import ProposalView from "@/components/simulator/ProposalView";
import { Proposal, ProposalStatus } from "./dashboard/types";
import DashboardKPIs from "./dashboard/DashboardKPIs";
import DashboardFunnel from "./dashboard/DashboardFunnel";
import DashboardAlerts from "./dashboard/DashboardAlerts";
import DashboardPipeline from "./dashboard/DashboardPipeline";
import PushNotificationButton from "./PushNotificationButton";

const AdminDashboard = () => {
  const { profile, store, storeSettings } = useStoreData();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingProposal, setViewingProposal] = useState<Proposal | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (store) loadData();
  }, [store]);

  // Realtime: auto-reload when proposals change for this store
  useEffect(() => {
    if (!store) return;
    const channel = supabase
      .channel('dashboard-proposals')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'proposals', filter: `store_id=eq.${store.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            toast.info(`🔔 Novo lead: ${(payload.new as any).customer_name}`, { duration: 8000 });
          }
          loadData();
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [store]);

  const loadData = async () => {
    if (!store) return;
    try {
      const { data, error } = await supabase
        .from("proposals")
        .select(`
          id, customer_name, customer_city, customer_whatsapp,
          total_price, created_at, selected_optionals, store_id, status,
          pool_models (name, length, width, depth, photo_url, differentials, included_items, not_included_items, base_price, delivery_days, installation_days, payment_terms, notes, category_id),
          stores (name)
        `)
        .eq("store_id", store.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProposals((data as any) || []);
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: ProposalStatus) => {
    try {
      const { error } = await supabase.from("proposals").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
      setProposals((prev) => prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p)));
      toast.success("Status atualizado");
    } catch {
      toast.error("Erro ao atualizar status");
    }
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    toast.info("Gerando PDF...");
    try {
      await html2pdf()
        .set({
          margin: 10,
          filename: `relatorio-propostas-${new Date().toISOString().split("T")[0]}.pdf`,
          html2canvas: { scale: 2 },
          jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
        })
        .from(reportRef.current)
        .save();
      toast.success("PDF exportado com sucesso!");
    } catch {
      toast.error("Erro ao gerar PDF");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" ref={reportRef}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-sm">
            Olá, <span className="font-bold text-foreground">{profile?.full_name || "Lojista"}</span>
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold">Painel Comercial</h1>
        </div>
        <div className="flex gap-2 print:hidden">
          <PushNotificationButton />
          <Button onClick={handleExportPDF} variant="outline" size="sm" className="shrink-0">
            <Download className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* (A) KPIs */}
      <DashboardKPIs proposals={proposals} />

      {/* (B) Funnel + (D) Alerts side by side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2">
          <DashboardFunnel proposals={proposals} />
        </div>
        <div className="lg:col-span-3">
          <DashboardAlerts proposals={proposals} onSelectProposal={setViewingProposal} />
        </div>
      </div>

      {/* (C) Pipeline */}
      <DashboardPipeline
        proposals={proposals}
        onUpdateStatus={updateStatus}
        onViewProposal={setViewingProposal}
        onExportPDF={setViewingProposal}
      />

      {/* Proposal Detail Dialog */}
      <Dialog open={!!viewingProposal} onOpenChange={(open) => !open && setViewingProposal(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle>Proposta — {viewingProposal?.customer_name}</DialogTitle>
          </DialogHeader>
          {viewingProposal?.pool_models && (
            <ProposalView
              model={viewingProposal.pool_models as any}
              selectedOptionals={[]}
              customerData={{
                name: viewingProposal.customer_name,
                city: viewingProposal.customer_city,
                whatsapp: viewingProposal.customer_whatsapp,
              }}
              category={viewingProposal.pool_models.name}
              onBack={() => setViewingProposal(null)}
              storeSettings={storeSettings}
              storeName={store?.name}
              storeCity={store?.city}
              storeState={store?.state}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
