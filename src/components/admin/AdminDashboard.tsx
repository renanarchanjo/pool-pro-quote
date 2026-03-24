import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Download } from "lucide-react";
import { useStoreData } from "@/hooks/useStoreData";
import { toast } from "sonner";
import { exportPDF } from "@/lib/exportPDF";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProposalView from "@/components/simulator/ProposalView";
import ProposalNotesPanel from "./dashboard/ProposalNotesPanel";
import { Proposal, ProposalStatus, STATUS_CONFIG } from "./dashboard/types";
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

      // Log status change as a note
      const { data: { user } } = await supabase.auth.getUser();
      if (user && store) {
        const oldProposal = proposals.find(p => p.id === id);
        const oldLabel = oldProposal ? (STATUS_CONFIG[oldProposal.status]?.label || oldProposal.status) : "?";
        const newLabel = STATUS_CONFIG[newStatus]?.label || newStatus;
        await supabase.from("proposal_notes" as any).insert({
          proposal_id: id,
          store_id: store.id,
          author_id: user.id,
          content: `Status alterado: ${oldLabel} → ${newLabel}`,
          note_type: "status_change",
        } as any);
      }

      setProposals((prev) => prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p)));
      toast.success("Status atualizado");
    } catch {
      toast.error("Erro ao atualizar status");
    }
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    await exportPDF({
      element: reportRef.current,
      filename: `relatorio-propostas-${new Date().toISOString().split("T")[0]}.pdf`,
      orientation: "landscape",
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6" ref={reportRef}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-xs sm:text-sm truncate">
            Olá, <span className="font-bold text-foreground">{profile?.full_name || "Lojista"}</span>
          </p>
          <h1 className="text-lg sm:text-xl md:text-3xl font-bold truncate">Painel Comercial</h1>
        </div>
        <div className="flex gap-2 shrink-0 print:hidden">
          <PushNotificationButton />
          <Button onClick={handleExportPDF} variant="outline" size="sm" className="shrink-0 min-h-[44px] md:min-h-0">
            <Download className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Exportar PDF</span>
            <span className="sm:hidden">PDF</span>
          </Button>
        </div>
      </div>

      {/* (A) KPIs */}
      <div style={{ pageBreakInside: "avoid" }}>
        <DashboardKPIs proposals={proposals} />
      </div>

      {/* (B) Funnel + (D) Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4" style={{ pageBreakInside: "avoid" }}>
        <DashboardFunnel proposals={proposals} />
        <DashboardAlerts proposals={proposals} onSelectProposal={setViewingProposal} />
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
          <Tabs defaultValue="proposal" className="w-full">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="proposal">Proposta</TabsTrigger>
              <TabsTrigger value="notes">Anotações</TabsTrigger>
            </TabsList>
            <TabsContent value="proposal">
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
            </TabsContent>
            <TabsContent value="notes">
              {viewingProposal && store && (
                <ProposalNotesPanel
                  proposalId={viewingProposal.id}
                  storeId={store.id}
                />
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
