import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useStoreData } from "@/hooks/useStoreData";
import { toast } from "sonner";
import { exportPDF, generatePDFBlob } from "@/lib/exportPDF";
import { formatPhoneForWhatsApp } from "@/lib/formatPhone";
import ProposalPreviewModal from "./ProposalPreviewModal";
import ProposalView from "@/components/simulator/ProposalView";
import { Proposal, ProposalStatus, STATUS_CONFIG } from "./dashboard/types";
import DashboardPipeline from "./dashboard/DashboardPipeline";

const AdminClients = () => {
  const { profile, store, storeSettings, role } = useStoreData();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingProposal, setViewingProposal] = useState<Proposal | null>(null);
  const [exportingProposal, setExportingProposal] = useState<Proposal | null>(null);
  const [leadDistributions, setLeadDistributions] = useState<{ proposal_id: string; accepted_by: string | null; status: string }[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [members, setMembers] = useState<{ id: string; full_name: string }[]>([]);
  const proposalPdfRef = useRef<HTMLDivElement>(null);
  const isOwner = role === "owner";

  useEffect(() => {
    if (!store) return;
    loadData();
  }, [store]);

  const loadData = async () => {
    if (!store) return;
    try {
      const [proposalsRes, distRes, partnersRes, membersRes] = await Promise.all([
        supabase
          .from("proposals")
          .select(`
            id, customer_name, customer_city, customer_whatsapp, created_by,
            total_price, created_at, selected_optionals, store_id, status, model_id,
            pool_models (id, name, length, width, depth, photo_url, differentials, included_items, not_included_items, base_price, cost, delivery_days, installation_days, payment_terms, notes, category_id, categories(name, brand_id, brands(name, logo_url, partner_id))),
            stores (name)
          `)
          .eq("store_id", store.id)
          .order("created_at", { ascending: false })
          .limit(2000),
        supabase.from("lead_distributions").select("proposal_id, accepted_by, status").eq("store_id", store.id),
        supabase.from("partners").select("id, name, logo_url, banner_1_url, banner_2_url, display_percent").eq("active", true).order("display_order"),
        (supabase as any).from("profiles").select("id, full_name").eq("store_id", store.id),
      ]);

      if (proposalsRes.error) throw proposalsRes.error;
      setProposals((proposalsRes.data as any) || []);
      setLeadDistributions(distRes.data || []);
      setPartners(partnersRes.data || []);
      setMembers(membersRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const visibleProposals = proposals.filter(p => {
    const dist = leadDistributions.find(d => d.proposal_id === p.id);
    if (dist && dist.status !== "accepted") return false;
    if (isOwner) return true;
    const acceptedDist = leadDistributions.find(d => d.proposal_id === p.id && d.status === "accepted");
    return acceptedDist?.accepted_by === profile?.id || (p as any).created_by === profile?.id;
  });

  const updateStatus = async (id: string, newStatus: ProposalStatus) => {
    try {
      const { error } = await supabase.from("proposals").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
      const { data: { user } } = await supabase.auth.getUser();
      if (user && store) {
        const oldP = proposals.find(p => p.id === id);
        const oldLabel = oldP ? (STATUS_CONFIG[oldP.status]?.label || oldP.status) : "?";
        const newLabel = STATUS_CONFIG[newStatus]?.label || newStatus;
        await supabase.from("proposal_notes" as any).insert({
          proposal_id: id, store_id: store.id, author_id: user.id,
          content: `Status alterado: ${oldLabel} → ${newLabel}`, note_type: "status_change",
        } as any);
      }
      setProposals(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
      toast.success("Status atualizado");
    } catch {
      toast.error("Erro ao atualizar status");
    }
  };

  const handleExportProposalPDF = async (proposal: Proposal) => {
    setExportingProposal(proposal);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    if (!proposalPdfRef.current) {
      toast.error("Erro ao preparar proposta para PDF");
      setExportingProposal(null);
      return;
    }
    await exportPDF({
      element: proposalPdfRef.current,
      filename: `proposta-${proposal.customer_name.replace(/\s+/g, "-")}.pdf`,
      orientation: "portrait", captureWidth: 800, sectionSelector: "[data-pdf-page]",
    });
    setExportingProposal(null);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-[20px] md:text-[24px] font-bold text-foreground leading-tight">
          Clientes (Follow-up)
        </h1>
        <p className="text-[12px] md:text-[13px] text-muted-foreground mt-0.5">
          Acompanhe e atualize o status das propostas dos seus clientes.
        </p>
      </div>

      <DashboardPipeline
        proposals={visibleProposals}
        onUpdateStatus={updateStatus}
        onViewProposal={setViewingProposal}
        onExportPDF={handleExportProposalPDF}
        members={isOwner ? members : []}
        getMemberId={(p) => {
          const acc = leadDistributions.find(d => d.proposal_id === p.id && d.status === "accepted");
          return acc?.accepted_by || (p as any).created_by || null;
        }}
      />

      {exportingProposal?.pool_models && (() => {
        const pm = exportingProposal.pool_models as any;
        const brand = pm?.categories?.brands;
        return (
          <div ref={proposalPdfRef} aria-hidden="true"
            style={{ position: "fixed", top: 0, left: 0, width: "794px", height: "auto", overflow: "hidden", clip: "rect(0,0,0,0)", clipPath: "inset(50%)", pointerEvents: "none", zIndex: -1 }}>
            <ProposalView
              model={pm}
              selectedOptionals={Array.isArray(exportingProposal.selected_optionals)
                ? exportingProposal.selected_optionals.map((o: any) =>
                    typeof o === "object" && o !== null
                      ? { name: o.name || "Item", price: o.price || 0 }
                      : { name: String(o), price: 0 })
                : []}
              customerData={{
                name: exportingProposal.customer_name,
                city: exportingProposal.customer_city,
                whatsapp: exportingProposal.customer_whatsapp,
              }}
              category={pm?.categories?.name || pm.name}
              onBack={() => {}}
              storeSettings={storeSettings}
              storeName={store?.name}
              storeCity={store?.city}
              storeState={store?.state}
              brandLogoUrl={brand?.logo_url}
              brandName={brand?.name}
              brandPartnerId={brand?.partner_id}
              partners={partners}
              storeId={store?.id}
              storeWhatsapp={store?.whatsapp}
              overrideTotalPrice={exportingProposal.total_price != null ? Number(exportingProposal.total_price) : null}
            />
          </div>
        );
      })()}

      <ProposalPreviewModal
        proposal={viewingProposal}
        onClose={() => setViewingProposal(null)}
        store={store}
        storeSettings={storeSettings}
        partners={partners}
      />
    </div>
  );
};

export default AdminClients;
