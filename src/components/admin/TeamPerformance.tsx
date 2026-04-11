import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStoreData } from "@/hooks/useStoreData";
import { exportPDF } from "@/lib/exportPDF";
import { Loader2, CalendarIcon, Download, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TeamPerformancePdfReport from "./TeamPerformancePdfReport";
import { cn } from "@/lib/utils";
import MemberSalesFunnel from "./MemberSalesFunnel";
import { format, startOfMonth, endOfMonth, subDays, subMonths, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "react-day-picker";

interface MemberProfile { id: string; full_name: string | null; }
interface LeadDist { id: string; proposal_id: string; store_id: string; status: string; accepted_by: string | null; accepted_at: string | null; created_at: string; }
interface ProposalData { id: string; status: string; total_price: number; created_at: string; customer_name: string; }

interface SellerMetrics {
  memberId: string; name: string; leadsReceived: number; leadsAccepted: number;
  nova: number; enviada: number; inNegotiation: number; closed: number; lost: number;
  revenueNova: number; revenueEnviada: number; revenueNeg: number; revenueClosed: number; revenueLost: number;
  revenuePredicted: number; ticketMedio: number; conversionRate: number;
  avgResponseTimeHours: number; avgClosingDays: number;
  totalProposals: number;
}

const DATE_PRESETS = [
  { label: "Hoje", value: "today", getRange: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }) },
  { label: "Últimos 7 dias", value: "7d", getRange: () => ({ from: startOfDay(subDays(new Date(), 7)), to: endOfDay(new Date()) }) },
  { label: "Últimos 30 dias", value: "30d", getRange: () => ({ from: startOfDay(subDays(new Date(), 30)), to: endOfDay(new Date()) }) },
  { label: "Mês atual", value: "month", getRange: () => ({ from: startOfMonth(new Date()), to: endOfDay(new Date()) }) },
  { label: "Mês anterior", value: "last_month", getRange: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
];

const STATUS_PROB: Record<string, number> = {
  nova: 0.2, enviada: 0.3, em_negociacao: 0.5, fechada: 1.0, perdida: 0.0,
};

const formatCurrency = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

const getInitials = (name: string) =>
  name.split(" ").filter(Boolean).map(w => w[0]).join("").toUpperCase().slice(0, 2);

const TeamPerformance = () => {
  const { store, role, profile } = useStoreData();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [distributions, setDistributions] = useState<LeadDist[]>([]);
  const [proposals, setProposals] = useState<ProposalData[]>([]);
  const [datePreset, setDatePreset] = useState("month");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const r = DATE_PRESETS.find(p => p.value === "month")!.getRange();
    return { from: r.from, to: r.to };
  });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState("all");
  const reportRef = useRef<HTMLDivElement>(null);
  const isOwner = role === "owner";

  useEffect(() => { if (store) loadData(); }, [store]);

  const loadData = async () => {
    if (!store) return;
    setLoading(true);
    try {
      const [membersRes, distRes, proposalsRes] = await Promise.all([
        (supabase as any).from("profiles").select("id, full_name").eq("store_id", store.id),
        supabase.from("lead_distributions").select("id, proposal_id, store_id, status, accepted_by, accepted_at, created_at").eq("store_id", store.id),
        supabase.from("proposals").select("id, status, total_price, created_at, customer_name, created_by").eq("store_id", store.id),
      ]);
      setMembers(membersRes.data || []);
      setDistributions(distRes.data || []);
      setProposals(proposalsRes.data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const applyPreset = (v: string) => {
    setDatePreset(v);
    const preset = DATE_PRESETS.find(p => p.value === v);
    if (preset) { const r = preset.getRange(); setDateRange({ from: r.from, to: r.to }); }
  };

  const metrics: SellerMetrics[] = useMemo(() => {
    if (!dateRange?.from) return [];
    const from = dateRange.from;
    const to = dateRange.to || new Date();
    const filteredDist = distributions.filter(d => { const dt = new Date(d.created_at); return dt >= from && dt <= to; });
    const proposalMap = new Map<string, ProposalData>();
    proposals.forEach(p => proposalMap.set(p.id, p));

    return members.map(member => {
      const memberDists = filteredDist.filter(d => d.accepted_by === member.id);
      const acceptedDists = memberDists.filter(d => d.status === "accepted");
      const acceptedIds = new Set(acceptedDists.map(d => d.proposal_id));
      const manualIds = new Set(
        Array.from(proposalMap.values())
          .filter(p => (p as any).created_by === member.id && !acceptedIds.has(p.id))
          .filter(p => { const dt = new Date(p.created_at); return dt >= from && dt <= to; })
          .map(p => p.id)
      );
      const allIds = new Set([...acceptedIds, ...manualIds]);
      const memberProposals = Array.from(allIds).map(id => proposalMap.get(id)).filter(Boolean) as ProposalData[];
      const nova = memberProposals.filter(p => p.status === "nova");
      const enviada = memberProposals.filter(p => p.status === "enviada");
      const inNeg = memberProposals.filter(p => p.status === "em_negociacao");
      const closed = memberProposals.filter(p => p.status === "fechada");
      const lost = memberProposals.filter(p => p.status === "perdida");
      const revenueClosed = closed.reduce((s, p) => s + p.total_price, 0);
      const revenuePredicted = memberProposals
        .filter(p => p.status !== "fechada" && p.status !== "perdida")
        .reduce((s, p) => s + p.total_price * (STATUS_PROB[p.status] || 0), 0);
      const totalDecided = closed.length + lost.length;
      const conversionRate = totalDecided > 0 ? (closed.length / totalDecided) * 100 : 0;
      const ticketMedio = closed.length > 0 ? revenueClosed / closed.length : 0;
      const responseTimes = acceptedDists
        .filter(d => d.accepted_at)
        .map(d => (new Date(d.accepted_at!).getTime() - new Date(d.created_at).getTime()) / (1000 * 60 * 60));
      const avgResponseTimeHours = responseTimes.length > 0 ? responseTimes.reduce((s, t) => s + t, 0) / responseTimes.length : 0;
      const closingDays = closed.map(p => {
        const dist = acceptedDists.find(d => d.proposal_id === p.id);
        if (!dist?.accepted_at) return 0;
        return (Date.now() - new Date(dist.accepted_at).getTime()) / (1000 * 60 * 60 * 24);
      });
      const avgClosingDays = closingDays.length > 0 ? closingDays.reduce((s, d) => s + d, 0) / closingDays.length : 0;

      return {
        memberId: member.id, name: member.full_name || "Sem nome",
        leadsReceived: memberDists.length, leadsAccepted: acceptedDists.length,
        nova: nova.length, enviada: enviada.length,
        inNegotiation: inNeg.length, closed: closed.length, lost: lost.length,
        revenueNova: nova.reduce((s, p) => s + p.total_price, 0),
        revenueEnviada: enviada.reduce((s, p) => s + p.total_price, 0),
        revenueNeg: inNeg.reduce((s, p) => s + p.total_price, 0),
        revenueClosed, revenueLost: lost.reduce((s, p) => s + p.total_price, 0),
        revenuePredicted, ticketMedio, conversionRate,
        avgResponseTimeHours, avgClosingDays,
        totalProposals: memberProposals.length,
      };
    }).filter(m => m.leadsReceived > 0 || m.leadsAccepted > 0 || m.totalProposals > 0)
      .sort((a, b) => b.revenueClosed - a.revenueClosed);
  }, [members, distributions, proposals, dateRange]);

  const filteredMetrics = useMemo(() => {
    if (!isOwner && profile?.id) return metrics.filter(m => m.memberId === profile.id);
    if (isOwner && selectedMember !== "all") return metrics.filter(m => m.memberId === selectedMember);
    return metrics;
  }, [metrics, isOwner, profile, selectedMember]);

  const totals = useMemo(() => filteredMetrics.reduce((acc, m) => ({
    leads: acc.leads + m.leadsAccepted, closed: acc.closed + m.closed,
    lost: acc.lost + m.lost, revenue: acc.revenue + m.revenueClosed,
    predicted: acc.predicted + m.revenuePredicted,
  }), { leads: 0, closed: 0, lost: 0, revenue: 0, predicted: 0 }), [filteredMetrics]);

  const teamConversion = (totals.closed + totals.lost) > 0 ? (totals.closed / (totals.closed + totals.lost)) * 100 : 0;

  const dateLabel = dateRange?.from
    ? dateRange.to
      ? `${format(dateRange.from, "dd/MM", { locale: ptBR })} - ${format(dateRange.to, "dd/MM", { locale: ptBR })}`
      : format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
    : "Selecionar período";

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    const dateText = dateLabel.replace(/\//g, "-");
    await exportPDF({
      element: reportRef.current,
      filename: `Performance-Equipe-${dateText}.pdf`,
      orientation: "landscape", captureWidth: 1100,
      sectionSelector: "[data-pdf-section]",
    });
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-[18px] font-semibold text-foreground">
          {isOwner ? "Performance da Equipe" : "Minha Performance"}
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          {isOwner && (
            <Select value={selectedMember} onValueChange={setSelectedMember}>
              <SelectTrigger className="h-8 w-[160px] text-[13px] bg-background border border-border rounded-md text-muted-foreground">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {members.map(m => <SelectItem key={m.id} value={m.id}>{m.full_name || "Sem nome"}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <button
            className="inline-flex items-center gap-2 h-9 pl-4 pr-3 text-[13px] font-semibold text-white bg-[#2d2d2d] rounded-full transition-all duration-150 hover:bg-[#1a1a1a] active:scale-95 disabled:opacity-50"
            onClick={handleExportPDF}
            disabled={filteredMetrics.length === 0}
          >
            PDF
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#dc2626]">
              <Download className="w-3.5 h-3.5 text-white" />
            </span>
          </button>
          <Select value={datePreset} onValueChange={applyPreset}>
            <SelectTrigger className="h-8 w-[140px] text-[13px] bg-background border border-border rounded-md text-muted-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_PRESETS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-[13px] gap-1 bg-background border border-border rounded-md text-muted-foreground">
                <CalendarIcon className="w-3 h-3" />
                {dateLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="range" selected={dateRange} onSelect={(range) => {
                setDateRange(range); setDatePreset("custom");
                if (range?.from && range?.to) setCalendarOpen(false);
              }} numberOfMonths={2} locale={ptBR} className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Hidden PDF report */}
      <div ref={reportRef} className="hidden">
        <TeamPerformancePdfReport
          dateLabel={dateLabel}
          totals={{ leads: totals.leads, closed: totals.closed, revenue: totals.revenue, predicted: totals.predicted, conversionRate: teamConversion }}
          metrics={filteredMetrics.map(m => ({
            memberId: m.memberId, name: m.name, leadsAccepted: m.leadsAccepted,
            inNegotiation: m.inNegotiation, closed: m.closed, lost: m.lost,
            revenueClosed: m.revenueClosed, revenuePredicted: m.revenuePredicted,
            ticketMedio: m.ticketMedio, conversionRate: m.conversionRate,
            avgResponseTimeHours: m.avgResponseTimeHours,
          }))}
        />
      </div>

      {filteredMetrics.length === 0 ? (
        <Card className="border border-border rounded-xl">
          <CardContent className="p-8 text-center">
            <BarChart3 className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum dado de performance no período selecionado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredMetrics.map((m, idx) => {
            const rank = idx + 1;
            const medal = rank === 1
              ? { emoji: "🥇", bg: "bg-amber-50 dark:bg-amber-950/30", ring: "ring-amber-300/50" }
              : rank === 2
              ? { emoji: "🥈", bg: "bg-slate-50 dark:bg-slate-900/30", ring: "ring-slate-300/50" }
              : rank === 3
              ? { emoji: "🥉", bg: "bg-orange-50 dark:bg-orange-950/30", ring: "ring-orange-300/50" }
              : null;

            return (
              <Card
                key={m.memberId}
                className={cn(
                  "border border-border rounded-xl transition-all duration-300",
                  medal && "ring-1 " + medal.ring
                )}
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                <CardContent className="p-4">
                  {/* Seller row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          medal ? medal.bg : "bg-accent"
                        )}>
                          {medal ? (
                            <span className="text-[20px] leading-none">{medal.emoji}</span>
                          ) : (
                            <span className="text-[13px] font-semibold text-muted-foreground">{rank}º</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-[14px] font-semibold text-foreground">{m.name}</p>
                          {rank <= 3 && (
                            <span className="text-[11px] font-semibold text-muted-foreground">#{rank}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[16px] font-bold text-foreground">{formatCurrency(m.revenueClosed)}</p>
                      <p className="text-[11px] text-muted-foreground">receita fechada</p>
                    </div>
                  </div>

                  {/* Separator */}
                  <div className="border-t border-border my-3" />

                  {/* Metrics grid 2x2 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Conversão</p>
                      <p className="text-[18px] font-bold text-foreground">{m.conversionRate.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Ticket Médio</p>
                      <p className="text-[18px] font-bold text-foreground">{formatCurrency(m.ticketMedio)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Tempo Resposta</p>
                      <p className="text-[18px] font-bold text-foreground">
                        {m.avgResponseTimeHours < 1
                          ? `${Math.round(m.avgResponseTimeHours * 60)}min`
                          : `${m.avgResponseTimeHours.toFixed(1)}h`}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Receita Prevista</p>
                      <p className="text-[18px] font-bold text-primary">{formatCurrency(m.revenuePredicted)}</p>
                    </div>
                  </div>


                  {/* Sales Funnel */}
                  <MemberSalesFunnel
                    stages={[
                      { label: "Novas", count: m.nova, revenue: m.revenueNova, color: "#0EA5E9" },
                      { label: "Enviadas", count: m.enviada, revenue: m.revenueEnviada, color: "#8B5CF6" },
                      { label: "Em Negociação", count: m.inNegotiation, revenue: m.revenueNeg, color: "#F59E0B" },
                      { label: "Fechadas", count: m.closed, revenue: m.revenueClosed, color: "#22C55E" },
                      { label: "Perdidas", count: m.lost, revenue: m.revenueLost, color: "#EF4444" },
                    ]}
                    total={m.totalProposals}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TeamPerformance;
