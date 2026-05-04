import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button"; 
import { Loader2, Download, CalendarIcon } from "lucide-react";
import { DashboardSkeleton } from "./AdminLoadingSkeleton";
import { useStoreData } from "@/hooks/useStoreData";
import { toast } from "sonner";
import { exportPDF, generatePDFBlob } from "@/lib/exportPDF";
import { formatPhoneForWhatsApp } from "@/lib/formatPhone";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProposalPreviewModal from "./ProposalPreviewModal";
import ProposalView from "@/components/simulator/ProposalView";
import { Proposal, ProposalStatus, STATUS_CONFIG } from "./dashboard/types";
import DashboardKPIs from "./dashboard/DashboardKPIs";
import DashboardFunnel from "./dashboard/DashboardFunnel";
import DashboardActivity from "./dashboard/DashboardActivity";
import DashboardAlerts from "./dashboard/DashboardAlerts";
import DashboardPipeline from "./dashboard/DashboardPipeline";
import DashboardPlanUsage from "./dashboard/DashboardPlanUsage";
import DashboardPdfReport from "./dashboard/DashboardPdfReport";
import { format, startOfMonth, endOfMonth, subDays, subMonths, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

const DATE_PRESETS = [
  { label: "Mês atual", value: "month", getRange: () => ({ from: startOfMonth(new Date()), to: endOfDay(new Date()) }) },
  { label: "Mês anterior", value: "last_month", getRange: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: "Últimos 7 dias", value: "7d", getRange: () => ({ from: startOfDay(subDays(new Date(), 7)), to: endOfDay(new Date()) }) },
  { label: "Últimos 30 dias", value: "30d", getRange: () => ({ from: startOfDay(subDays(new Date(), 30)), to: endOfDay(new Date()) }) },
  { label: "Últimos 90 dias", value: "90d", getRange: () => ({ from: startOfDay(subDays(new Date(), 90)), to: endOfDay(new Date()) }) },
  { label: "Tudo", value: "all", getRange: () => ({ from: new Date(2020, 0, 1), to: endOfDay(new Date()) }) },
];

const AdminDashboard = () => {
  const { profile, store, storeSettings, role } = useStoreData();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingProposal, setViewingProposal] = useState<Proposal | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const proposalPdfRef = useRef<HTMLDivElement>(null);
  
  const [teamMembers, setTeamMembers] = useState<{ id: string; full_name: string | null }[]>([]);
  const [filterMember, setFilterMember] = useState<string>("all");
  const [leadDistributions, setLeadDistributions] = useState<{ proposal_id: string; accepted_by: string | null; status: string }[]>([]);
  const [commissionPercent, setCommissionPercent] = useState(0);
  const [allCommissions, setAllCommissions] = useState<{ member_id: string; commission_percent: number }[]>([]);
  const [partners, setPartners] = useState<{ id: string; name: string; logo_url: string | null; banner_1_url: string | null; banner_2_url: string | null; display_percent?: number }[]>([]);
  const isOwner = role === "owner";
  const [pdfDatePreset, setPdfDatePreset] = useState("month");
  const [pdfDateRange, setPdfDateRange] = useState<DateRange | undefined>(() => {
    const r = DATE_PRESETS[0].getRange();
    return { from: r.from, to: r.to };
  });
  const [calendarOpen, setCalendarOpen] = useState(false);

  const applyPdfPreset = (v: string) => {
    setPdfDatePreset(v);
    const preset = DATE_PRESETS.find(p => p.value === v);
    if (preset) {
      const r = preset.getRange();
      setPdfDateRange({ from: r.from, to: r.to });
    }
  };

  const pdfDateLabel = pdfDateRange?.from
    ? pdfDateRange.to
      ? `${format(pdfDateRange.from, "dd/MM", { locale: ptBR })} - ${format(pdfDateRange.to, "dd/MM", { locale: ptBR })}`
      : format(pdfDateRange.from, "dd/MM/yyyy", { locale: ptBR })
    : "Período";

  const memberFilteredProposals = proposals.filter(p => {
    // For lead-distributed proposals, only show if someone accepted it
    const dist = leadDistributions.find(d => d.proposal_id === p.id);
    if (dist && dist.status !== "accepted") return false;

    if (isOwner) {
      if (filterMember === "all") return true;
      const acceptedDist = leadDistributions.find(d => d.proposal_id === p.id && d.status === "accepted");
      return acceptedDist?.accepted_by === filterMember || (p as any).created_by === filterMember;
    }
    const acceptedDist = leadDistributions.find(d => d.proposal_id === p.id && d.status === "accepted");
    return acceptedDist?.accepted_by === profile?.id || (p as any).created_by === profile?.id;
  });

  const filteredProposals = memberFilteredProposals.filter(p => {
    if (!pdfDateRange?.from) return true;
    const d = new Date(p.created_at);
    if (d < pdfDateRange.from) return false;
    if (pdfDateRange.to && d > pdfDateRange.to) return false;
    return true;
  });

  useEffect(() => {
    if (!store) return;
    loadData();
    const interval = setInterval(() => loadData(), 30000);
    return () => clearInterval(interval);
  }, [store]);

  const loadData = async () => {
    if (!store) return;
    try {
      const [proposalsRes, distRes, teamRes, partnersRes] = await Promise.all([
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
        (supabase as any).from("profiles").select("id, full_name").eq("store_id", store.id),
        supabase.from("partners").select("id, name, logo_url, banner_1_url, banner_2_url, display_percent").eq("active", true).order("display_order"),
      ]);

      if (proposalsRes.error) throw proposalsRes.error;

      const rawProposals = (proposalsRes.data as any) || [];
      const needsResolve = rawProposals.filter((p: any) =>
        Array.isArray(p.selected_optionals) &&
        p.selected_optionals.length > 0 &&
        typeof p.selected_optionals[0] === "string"
      );

      // Resolve optionals: enrich with name, price and cost
      const allOptionalIds = [
        ...new Set(
          rawProposals.flatMap((p: any) => {
            if (!Array.isArray(p.selected_optionals)) return [];
            return p.selected_optionals.map((o: any) =>
              typeof o === "string" ? o : o?.id
            ).filter(Boolean);
          })
        ),
      ] as string[];

      let optCostMap: Record<string, { name: string; price: number; cost: number }> = {};
      if (allOptionalIds.length > 0) {
        const [{ data: generalOpts }, { data: modelOpts }] = await Promise.all([
          supabase.from("optionals").select("id, name, price, cost").in("id", allOptionalIds),
          supabase.from("model_optionals").select("id, name, price, cost").in("id", allOptionalIds),
        ]);
        for (const o of [...(generalOpts || []), ...(modelOpts || [])]) {
          optCostMap[o.id] = { name: o.name, price: Number(o.price), cost: Number(o.cost || 0) };
        }
      }

      // Enrich selected_optionals with cost data
      for (const p of rawProposals) {
        if (!Array.isArray(p.selected_optionals)) continue;
        p.selected_optionals = p.selected_optionals.map((o: any) => {
          const id = typeof o === "string" ? o : o?.id;
          const found = id ? optCostMap[id] : null;
          if (found) return { id, name: found.name, price: found.price, cost: found.cost };
          if (typeof o === "object" && o !== null) return { ...o, cost: o.cost || 0 };
          return { id: o, name: String(o), price: 0, cost: 0 };
        });
      }

      // Load included items costs per model for net revenue calculation
      const modelIds = [...new Set(rawProposals.map((p: any) => p.pool_models?.id || p.model_id).filter(Boolean))] as string[];
      if (modelIds.length > 0) {
        const { data: includedItems } = await supabase
          .from("model_included_items")
          .select("model_id, cost")
          .in("model_id", modelIds)
          .eq("active", true);

        const includedCostByModel: Record<string, number> = {};
        for (const item of (includedItems || [])) {
          includedCostByModel[item.model_id] = (includedCostByModel[item.model_id] || 0) + Number(item.cost || 0);
        }

        // Attach included items cost to pool_models
        for (const p of rawProposals) {
          if (p.pool_models) {
            const mid = (p.pool_models as any).id || p.model_id;
            (p.pool_models as any)._included_items_cost = includedCostByModel[mid] || 0;
          }
        }
      }

      setProposals(rawProposals);
      setLeadDistributions(distRes.data || []);
      setTeamMembers(teamRes.data || []);
      setPartners(partnersRes.data || []);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const [{ data: commData }, { data: allCommData }] = await Promise.all([
          supabase
            .from("commission_settings")
            .select("commission_percent")
            .eq("store_id", store.id)
            .eq("member_id", user.id)
            .maybeSingle(),
          supabase
            .from("commission_settings")
            .select("member_id, commission_percent")
            .eq("store_id", store.id),
        ]);
        setCommissionPercent(commData?.commission_percent || 0);
        setAllCommissions(allCommData || []);
      }
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
      filename: `relatorio-dashboard-${pdfDateLabel.replace(/\//g, "-")}.pdf`,
      orientation: "landscape",
      captureWidth: 1100,
      sectionSelector: "[data-pdf-section]",
    });
  };

  const [exportingProposal, setExportingProposal] = useState<Proposal | null>(null);

  const handleExportProposalPDF = async (proposal: Proposal) => {
    setExportingProposal(proposal);
    // Wait for React to render the hidden ProposalView
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    if (!proposalPdfRef.current) {
      toast.error("Erro ao preparar proposta para PDF");
      setExportingProposal(null);
      return;
    }

    await exportPDF({
      element: proposalPdfRef.current,
      filename: `proposta-${proposal.customer_name.replace(/\s+/g, "-")}.pdf`,
      orientation: "portrait",
      captureWidth: 800,
      sectionSelector: "[data-pdf-page]",
    });

    setExportingProposal(null);
  };

  const handleSendWhatsApp = async (proposal: Proposal) => {
    // Generate PDF using the hidden ProposalView
    setExportingProposal(proposal);
    // Wait for React to render the hidden ProposalView
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    if (!proposalPdfRef.current) {
      toast.error("Erro ao preparar proposta para envio");
      setExportingProposal(null);
      return;
    }

    try {
      const pdfBlob = await generatePDFBlob({
        element: proposalPdfRef.current,
        orientation: "portrait",
        captureWidth: 800,
        sectionSelector: "[data-pdf-page]",
      });

      const formData = new FormData();
      formData.append("pdf", new File([pdfBlob], `proposta-${proposal.id}.pdf`, { type: "application/pdf" }));
      formData.append("storeId", store!.id);
      formData.append("proposalId", proposal.id);
      formData.append("customerPhone", formatPhoneForWhatsApp(proposal.customer_whatsapp));
      formData.append("customerName", proposal.customer_name);
      formData.append("storeName", store?.name || "SimulaPool");

      const { data, error } = await supabase.functions.invoke("send-proposal-whatsapp", {
        body: formData,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro ao enviar proposta via WhatsApp");

      await updateStatus(proposal.id, "enviada");
      toast.success("Proposta enviada para o WhatsApp do cliente!");
    } catch (err) {
      console.error("Erro ao enviar WhatsApp:", err);
      toast.error("Erro ao enviar proposta via WhatsApp");
    } finally {
      setExportingProposal(null);
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header with filters */}
      <div className="space-y-3">
        <div>
          <h1 className="text-[20px] md:text-[24px] font-bold text-foreground leading-tight">
            {(() => {
              const h = new Date().getHours();
              const greeting = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
              return `${greeting}, ${profile?.full_name || "Lojista"} 👋`;
            })()}
          </h1>
          <p className="text-[12px] md:text-[13px] text-muted-foreground capitalize mt-0.5">
            {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isOwner && teamMembers.length > 1 && (
            <Select value={filterMember} onValueChange={setFilterMember}>
              <SelectTrigger className="h-8 w-[140px] text-[13px] bg-input border-border text-foreground rounded-md">
                <SelectValue placeholder="Membro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {teamMembers.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.full_name || "Sem nome"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={pdfDatePreset} onValueChange={applyPdfPreset}>
            <SelectTrigger className="h-8 w-[130px] text-[13px] bg-input border-border text-foreground rounded-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_PRESETS.map(p => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-[13px] gap-1.5 bg-input border-border rounded-md font-normal text-foreground">
                <CalendarIcon className="w-3.5 h-3.5" />
                {pdfDateLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={pdfDateRange}
                onSelect={(range) => {
                  setPdfDateRange(range);
                  setPdfDatePreset("custom");
                  if (range?.from && range?.to) setCalendarOpen(false);
                }}
                numberOfMonths={1}
                locale={ptBR}
                className={cn("p-2 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <button onClick={handleExportPDF} className="inline-flex items-center gap-2 h-8 pl-3 pr-2 text-[12px] font-semibold text-white bg-[#2d2d2d] rounded-full transition-all duration-150 hover:bg-[#1a1a1a] active:scale-95 shrink-0">
            PDF
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#dc2626]">
              <Download className="w-3 h-3 text-white" />
            </span>
          </button>
        </div>
      </div>

      {/* Printable content */}
      <div ref={reportRef} aria-hidden="true" style={{ position: "fixed", left: "-9999px", top: 0, width: "1100px", overflow: "hidden", pointerEvents: "none", zIndex: -1 }}>
        <DashboardPdfReport
          proposals={filteredProposals}
          profileName={profile?.full_name}
          storeName={store?.name}
          dateLabel={pdfDateLabel}
        />
      </div>

      {/* On-screen interactive dashboard */}
      <div className="space-y-4 md:space-y-6">
        <div style={{ pageBreakInside: "avoid" }}>
          <DashboardKPIs
            proposals={filteredProposals}
            role={role}
            commissionPercent={commissionPercent}
            allCommissions={allCommissions}
            leadDistributions={leadDistributions}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 md:gap-4" style={{ pageBreakInside: "avoid" }}>
          <DashboardFunnel proposals={filteredProposals} />
          <DashboardAlerts proposals={filteredProposals} onSelectProposal={setViewingProposal} />
        </div>

        <DashboardPipeline
          proposals={filteredProposals}
          onUpdateStatus={updateStatus}
          onViewProposal={setViewingProposal}
          onExportPDF={handleExportProposalPDF}
          
        />
      </div>

      {/* Hidden proposal for PDF export */}
      {exportingProposal?.pool_models && (() => {
        const pm = exportingProposal.pool_models as any;
        const brand = pm?.categories?.brands;
        return (
          <div
            ref={proposalPdfRef}
            aria-hidden="true"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "794px",
              height: "auto",
              overflow: "hidden",
              clip: "rect(0,0,0,0)",
              clipPath: "inset(50%)",
              pointerEvents: "none",
              zIndex: -1,
            }}
          >
            <ProposalView
              model={pm}
              selectedOptionals={
                Array.isArray(exportingProposal.selected_optionals)
                  ? exportingProposal.selected_optionals.map((o: any) =>
                      typeof o === "object" && o !== null
                        ? { name: o.name || "Item", price: o.price || 0 }
                        : { name: String(o), price: 0 }
                    )
                  : []
              }
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

export default AdminDashboard;
