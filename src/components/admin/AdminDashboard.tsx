import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button"; 
import { Loader2, Download, CalendarIcon, ZoomIn, ZoomOut, X } from "lucide-react";
import { useStoreData } from "@/hooks/useStoreData";
import { toast } from "sonner";
import { exportPDF } from "@/lib/exportPDF";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProposalView from "@/components/simulator/ProposalView";
import { Proposal, ProposalStatus, STATUS_CONFIG } from "./dashboard/types";
import DashboardKPIs from "./dashboard/DashboardKPIs";
import DashboardFunnel from "./dashboard/DashboardFunnel";
import DashboardAlerts from "./dashboard/DashboardAlerts";
import DashboardPipeline from "./dashboard/DashboardPipeline";
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
  const [previewZoomed, setPreviewZoomed] = useState(false);
  const [teamMembers, setTeamMembers] = useState<{ id: string; full_name: string | null }[]>([]);
  const [filterMember, setFilterMember] = useState<string>("all");
  const [leadDistributions, setLeadDistributions] = useState<{ proposal_id: string; accepted_by: string | null; status: string }[]>([]);
  const [commissionPercent, setCommissionPercent] = useState(0);
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
    if (isOwner) {
      if (filterMember === "all") return true;
      const dist = leadDistributions.find(d => d.proposal_id === p.id && d.status === "accepted");
      return dist?.accepted_by === filterMember || (p as any).created_by === filterMember;
    }
    const dist = leadDistributions.find(d => d.proposal_id === p.id && d.status === "accepted");
    return dist?.accepted_by === profile?.id || (p as any).created_by === profile?.id;
  });

  const filteredProposals = memberFilteredProposals.filter(p => {
    if (!pdfDateRange?.from) return true;
    const d = new Date(p.created_at);
    if (d < pdfDateRange.from) return false;
    if (pdfDateRange.to && d > pdfDateRange.to) return false;
    return true;
  });

  useEffect(() => {
    if (store) loadData();
  }, [store]);

  useEffect(() => {
    if (!store) return;
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
          total_price, created_at, selected_optionals, store_id, status,
          pool_models (name, length, width, depth, photo_url, differentials, included_items, not_included_items, base_price, cost, delivery_days, installation_days, payment_terms, notes, category_id, categories(name, brand_id, brands(name, logo_url, partner_id))),
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
        typeof p.selected_optionals[0] === "string" &&
        !p.selected_optionals[0].includes("{")
      );

      if (needsResolve.length > 0) {
        const allIds = [...new Set(needsResolve.flatMap((p: any) => p.selected_optionals as string[]))] as string[];
        const [{ data: generalOpts }, { data: modelOpts }] = await Promise.all([
          supabase.from("optionals").select("id, name, price").in("id", allIds as string[]),
          supabase.from("model_optionals").select("id, name, price").in("id", allIds as string[]),
        ]);
        const allOpts = [...(generalOpts || []), ...(modelOpts || [])];
        for (const p of needsResolve) {
          p.selected_optionals = (p.selected_optionals as string[]).map((id: string) => {
            const found = allOpts.find((o: any) => o.id === id);
            return found ? { id: found.id, name: found.name, price: found.price } : { id, name: id, price: 0 };
          });
        }
      }

      setProposals(rawProposals);
      setLeadDistributions(distRes.data || []);
      setTeamMembers(teamRes.data || []);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: commData } = await supabase
          .from("commission_settings")
          .select("commission_percent")
          .eq("store_id", store.id)
          .eq("member_id", user.id)
          .maybeSingle();
        setCommissionPercent(commData?.commission_percent || 0);
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
    // Wait for render
    await new Promise(r => setTimeout(r, 300));
    if (!proposalPdfRef.current) return;
    await exportPDF({
      element: proposalPdfRef.current,
      filename: `proposta-${proposal.customer_name.replace(/\s+/g, "-")}.pdf`,
      orientation: "portrait",
      captureWidth: 800,
    });
    setExportingProposal(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header with filters */}
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Olá, <span className="font-medium text-foreground">{profile?.full_name || "Lojista"}</span>
        </p>
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
      <div ref={reportRef} className="hidden">
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
          <DashboardKPIs proposals={filteredProposals} role={role} commissionPercent={commissionPercent} />
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
      {exportingProposal?.pool_models && (
        <div ref={proposalPdfRef} className="hidden">
          <ProposalView
            model={exportingProposal.pool_models as any}
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
            category={exportingProposal.pool_models.name}
            onBack={() => {}}
            storeSettings={storeSettings}
            storeName={store?.name}
            storeCity={store?.city}
            storeState={store?.state}
          />
        </div>
      )}

      {/* Proposal Preview Overlay (same as Leads) */}
      {viewingProposal && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 md:p-6"
          onClick={() => { setViewingProposal(null); setPreviewZoomed(false); }}
        >
          <div
            className="relative bg-background rounded-2xl shadow-2xl border border-border flex flex-col w-full max-w-lg max-h-[85dvh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0">
              <span className="text-sm font-bold text-foreground">Proposta</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPreviewZoomed(!previewZoomed)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
                  title={previewZoomed ? "Reduzir" : "Ampliar"}
                >
                  {previewZoomed ? <ZoomOut className="w-4 h-4 text-muted-foreground" /> : <ZoomIn className="w-4 h-4 text-muted-foreground" />}
                </button>
                <button
                  onClick={() => { setViewingProposal(null); setPreviewZoomed(false); }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Proposal content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
              <div
                style={{
                  transform: previewZoomed ? 'scale(1)' : 'scale(0.65)',
                  transformOrigin: 'top center',
                  width: previewZoomed ? '100%' : '154%',
                  marginLeft: previewZoomed ? '0' : '-27%',
                  minHeight: previewZoomed ? 'auto' : '154%',
                  transition: 'transform 250ms ease, width 250ms ease, margin 250ms ease',
                }}
              >
                {viewingProposal?.pool_models && (
                  <ProposalView
                    model={viewingProposal.pool_models as any}
                    selectedOptionals={
                      Array.isArray(viewingProposal.selected_optionals)
                        ? viewingProposal.selected_optionals.map((o: any) =>
                            typeof o === "object" && o !== null
                              ? { name: o.name || "Item", price: o.price || 0 }
                              : { name: String(o), price: 0 }
                          )
                        : []
                    }
                    customerData={{
                      name: viewingProposal.customer_name,
                      city: viewingProposal.customer_city,
                      whatsapp: viewingProposal.customer_whatsapp,
                    }}
                    category={viewingProposal.pool_models.name}
                    onBack={() => { setViewingProposal(null); setPreviewZoomed(false); }}
                    storeSettings={storeSettings}
                    storeName={store?.name}
                    storeCity={store?.city}
                    storeState={store?.state}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
