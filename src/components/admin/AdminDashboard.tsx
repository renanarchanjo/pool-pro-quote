import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button"; 
import { Loader2, Download, CalendarIcon } from "lucide-react";
import { useStoreData } from "@/hooks/useStoreData";
import { toast } from "sonner";
import { exportPDF } from "@/lib/exportPDF";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProposalView from "@/components/simulator/ProposalView";
import ProposalNotesPanel from "./dashboard/ProposalNotesPanel";
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
  const [teamMembers, setTeamMembers] = useState<{ id: string; full_name: string | null }[]>([]);
  const [filterMember, setFilterMember] = useState<string>("all");
  const [leadDistributions, setLeadDistributions] = useState<{ proposal_id: string; accepted_by: string | null; status: string }[]>([]);
  const [commissionPercent, setCommissionPercent] = useState(0);
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

  // Filter by member (owner filter or seller isolation)
  const memberFilteredProposals = proposals.filter(p => {
    if (isOwner) {
      if (filterMember === "all") return true;
      const dist = leadDistributions.find(d => d.proposal_id === p.id && d.status === "accepted");
      return dist?.accepted_by === filterMember || (p as any).created_by === filterMember;
    }
    // Seller: only see own proposals
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

  // Polling: auto-reload dashboard data periodically
  useEffect(() => {
    if (!store) return;
    const interval = setInterval(() => loadData(), 30000);
    return () => clearInterval(interval);
  }, [store]);

  const loadData = async () => {
    if (!store) return;
    try {
      const [proposalsRes, distRes, teamRes] = await Promise.all([
        supabase
        .from("proposals")
        .select(`
          id, customer_name, customer_city, customer_whatsapp, created_by,
          total_price, created_at, selected_optionals, store_id, status,
          pool_models (name, length, width, depth, photo_url, differentials, included_items, not_included_items, base_price, cost, delivery_days, installation_days, payment_terms, notes, category_id),
          stores (name)
        `)
        .eq("store_id", store.id)
        .order("created_at", { ascending: false })
        .limit(2000),
        supabase.from("lead_distributions").select("proposal_id, accepted_by, status").eq("store_id", store.id),
        (supabase as any).from("profiles").select("id, full_name").eq("store_id", store.id),
      ]);

      if (proposalsRes.error) throw proposalsRes.error;

      // Resolve any proposals that stored optionals as plain UUID arrays
      const rawProposals = (proposalsRes.data as any) || [];
      const needsResolve = rawProposals.filter((p: any) =>
        Array.isArray(p.selected_optionals) &&
        p.selected_optionals.length > 0 &&
        typeof p.selected_optionals[0] === "string" &&
        !p.selected_optionals[0].includes("{")
      );

      if (needsResolve.length > 0) {
        const allIds = [...new Set(needsResolve.flatMap((p: any) => p.selected_optionals as string[]))];
        const [{ data: generalOpts }, { data: modelOpts }] = await Promise.all([
          supabase.from("optionals").select("id, name, price").in("id", allIds),
          supabase.from("model_optionals").select("id, name, price").in("id", allIds),
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

      // Fetch commission for current user (seller view)
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
      filename: `relatorio-dashboard-${pdfDateLabel.replace(/\//g, "-")}.pdf`,
      orientation: "landscape",
      captureWidth: 1100,
      sectionSelector: "[data-pdf-section]",
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
    <div className="space-y-3 md:space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <p className="text-sm md:text-base text-muted-foreground truncate">
          Olá, <span className="font-bold text-foreground">{profile?.full_name || "Lojista"}</span>
        </p>
        <div className="flex items-center gap-1.5 flex-wrap">
          {isOwner && teamMembers.length > 1 && (
            <Select value={filterMember} onValueChange={setFilterMember}>
              <SelectTrigger className="h-8 w-[120px] sm:w-[150px] text-xs">
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
            <SelectTrigger className="h-8 w-[110px] sm:w-[130px] text-xs">
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
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                <CalendarIcon className="w-3 h-3" />
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
          <Button onClick={handleExportPDF} variant="outline" size="sm" className="h-8 shrink-0 text-xs">
            <Download className="w-3.5 h-3.5 mr-1" />
            PDF
          </Button>
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
      <div className="space-y-3 md:space-y-6">
        {/* (A) KPIs */}
        <div style={{ pageBreakInside: "avoid" }}>
          <DashboardKPIs proposals={filteredProposals} role={role} commissionPercent={commissionPercent} />
        </div>

        {/* (B) Funnel + (D) Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 md:gap-4" style={{ pageBreakInside: "avoid" }}>
          <DashboardFunnel proposals={filteredProposals} />
          <DashboardAlerts proposals={filteredProposals} onSelectProposal={setViewingProposal} />
        </div>

        {/* (C) Pipeline */}
        <DashboardPipeline
          proposals={filteredProposals}
          onUpdateStatus={updateStatus}
          onViewProposal={setViewingProposal}
          onExportPDF={setViewingProposal}
        />
      </div>

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
