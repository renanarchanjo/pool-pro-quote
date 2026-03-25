import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStoreData } from "@/hooks/useStoreData";
import { toast } from "sonner";
import { exportPDF } from "@/lib/exportPDF";
import { Loader2, CalendarIcon, TrendingUp, TrendingDown, Trophy, Clock, Target, DollarSign, BarChart3, FileDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import TeamPerformancePdfReport from "./TeamPerformancePdfReport";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, subDays, subMonths, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "react-day-picker";

interface MemberProfile {
  id: string;
  full_name: string | null;
}

interface LeadDist {
  id: string;
  proposal_id: string;
  store_id: string;
  status: string;
  accepted_by: string | null;
  accepted_at: string | null;
  created_at: string;
}

interface ProposalData {
  id: string;
  status: string;
  total_price: number;
  created_at: string;
  customer_name: string;
}

interface SellerMetrics {
  memberId: string;
  name: string;
  leadsReceived: number;
  leadsAccepted: number;
  inNegotiation: number;
  closed: number;
  lost: number;
  revenueClosed: number;
  revenuePredicted: number;
  ticketMedio: number;
  conversionRate: number;
  avgResponseTimeHours: number;
  avgClosingDays: number;
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

const TeamPerformance = () => {
  const { store, role, profile } = useStoreData();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [distributions, setDistributions] = useState<LeadDist[]>([]);
  const [proposals, setProposals] = useState<ProposalData[]>([]);
  const [datePreset, setDatePreset] = useState("month");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const preset = DATE_PRESETS.find(p => p.value === "month");
    const r = preset!.getRange();
    return { from: r.from, to: r.to };
  });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState("all");
  const reportRef = useRef<HTMLDivElement>(null);
  const isOwner = role === "owner";

  useEffect(() => {
    if (store) loadData();
  }, [store]);

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
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (v: string) => {
    setDatePreset(v);
    const preset = DATE_PRESETS.find(p => p.value === v);
    if (preset) {
      const r = preset.getRange();
      setDateRange({ from: r.from, to: r.to });
    }
  };

  const metrics: SellerMetrics[] = useMemo(() => {
    if (!dateRange?.from) return [];
    const from = dateRange.from;
    const to = dateRange.to || new Date();

    // Filter distributions in range
    const filteredDist = distributions.filter(d => {
      const dt = new Date(d.created_at);
      return dt >= from && dt <= to;
    });

    // Build proposal map
    const proposalMap = new Map<string, ProposalData>();
    proposals.forEach(p => proposalMap.set(p.id, p));

    return members.map(member => {
      // Flow 1: Leads accepted by this member
      const memberDists = filteredDist.filter(d => d.accepted_by === member.id);
      const acceptedDists = memberDists.filter(d => d.status === "accepted");
      const acceptedIds = new Set(acceptedDists.map(d => d.proposal_id));

      // Flow 2: Proposals manually created by this member (created_by)
      const manualIds = new Set(
        Array.from(proposalMap.values())
          .filter(p => (p as any).created_by === member.id && !acceptedIds.has(p.id))
          .filter(p => { const dt = new Date(p.created_at); return dt >= from && dt <= to; })
          .map(p => p.id)
      );

      // Merge both flows
      const allIds = new Set([...acceptedIds, ...manualIds]);
      const memberProposals = Array.from(allIds).map(id => proposalMap.get(id)).filter(Boolean) as ProposalData[];

      const closed = memberProposals.filter(p => p.status === "fechada");
      const lost = memberProposals.filter(p => p.status === "perdida");
      const inNeg = memberProposals.filter(p => p.status === "em_negociacao");

      const revenueClosed = closed.reduce((s, p) => s + p.total_price, 0);
      const revenuePredicted = memberProposals
        .filter(p => p.status !== "fechada" && p.status !== "perdida")
        .reduce((s, p) => s + p.total_price * (STATUS_PROB[p.status] || 0), 0);

      const totalDecided = closed.length + lost.length;
      const conversionRate = totalDecided > 0 ? (closed.length / totalDecided) * 100 : 0;
      const ticketMedio = closed.length > 0 ? revenueClosed / closed.length : 0;

      // Avg response time (time between distribution created_at and accepted_at)
      const responseTimes = acceptedDists
        .filter(d => d.accepted_at)
        .map(d => (new Date(d.accepted_at!).getTime() - new Date(d.created_at).getTime()) / (1000 * 60 * 60));
      const avgResponseTimeHours = responseTimes.length > 0
        ? responseTimes.reduce((s, t) => s + t, 0) / responseTimes.length
        : 0;

      // Avg closing days for closed proposals
      const closingDays = closed.map(p => {
        const dist = acceptedDists.find(d => d.proposal_id === p.id);
        if (!dist?.accepted_at) return 0;
        return (Date.now() - new Date(dist.accepted_at).getTime()) / (1000 * 60 * 60 * 24);
      });
      const avgClosingDays = closingDays.length > 0
        ? closingDays.reduce((s, d) => s + d, 0) / closingDays.length
        : 0;

      return {
        memberId: member.id,
        name: member.full_name || "Sem nome",
        leadsReceived: memberDists.length,
        leadsAccepted: acceptedDists.length,
        inNegotiation: inNeg.length,
        closed: closed.length,
        lost: lost.length,
        revenueClosed,
        revenuePredicted,
        ticketMedio,
        conversionRate,
        avgResponseTimeHours,
        avgClosingDays,
      };
    }).filter(m => m.leadsReceived > 0 || m.leadsAccepted > 0)
      .sort((a, b) => b.revenueClosed - a.revenueClosed);
  }, [members, distributions, proposals, dateRange]);

  // Filter metrics by role and selected member
  const filteredMetrics = useMemo(() => {
    if (!isOwner && profile?.id) {
      return metrics.filter(m => m.memberId === profile.id);
    }
    if (isOwner && selectedMember !== "all") {
      return metrics.filter(m => m.memberId === selectedMember);
    }
    return metrics;
  }, [metrics, isOwner, profile, selectedMember]);

  // Team totals
  const totals = useMemo(() => {
    return filteredMetrics.reduce((acc, m) => ({
      leads: acc.leads + m.leadsAccepted,
      closed: acc.closed + m.closed,
      lost: acc.lost + m.lost,
      revenue: acc.revenue + m.revenueClosed,
      predicted: acc.predicted + m.revenuePredicted,
    }), { leads: 0, closed: 0, lost: 0, revenue: 0, predicted: 0 });
  }, [filteredMetrics]);

  const teamConversion = (totals.closed + totals.lost) > 0
    ? (totals.closed / (totals.closed + totals.lost)) * 100
    : 0;

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
    <div className="space-y-4">
      {/* Header with controls - excluded from PDF */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">{isOwner ? "Performance da Equipe" : "Minha Performance"}</h3>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isOwner && (
            <Select value={selectedMember} onValueChange={setSelectedMember}>
              <SelectTrigger className="h-8 w-[160px] text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {members.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.full_name || "Sem nome"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={handleExportPDF} disabled={filteredMetrics.length === 0}>
            <FileDown className="w-3 h-3" />
            PDF
          </Button>
          <Select value={datePreset} onValueChange={applyPreset}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
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
                {dateLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={(range) => {
                  setDateRange(range);
                  setDatePreset("custom");
                  if (range?.from && range?.to) setCalendarOpen(false);
                }}
                numberOfMonths={2}
                locale={ptBR}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div ref={reportRef} className="hidden">
        <TeamPerformancePdfReport
          dateLabel={dateLabel}
          totals={{
            leads: totals.leads,
            closed: totals.closed,
            revenue: totals.revenue,
            predicted: totals.predicted,
            conversionRate: teamConversion,
          }}
          metrics={filteredMetrics.map((m) => ({
            memberId: m.memberId,
            name: m.name,
            leadsAccepted: m.leadsAccepted,
            inNegotiation: m.inNegotiation,
            closed: m.closed,
            lost: m.lost,
            revenueClosed: m.revenueClosed,
            revenuePredicted: m.revenuePredicted,
            ticketMedio: m.ticketMedio,
            conversionRate: m.conversionRate,
            avgResponseTimeHours: m.avgResponseTimeHours,
          }))}
        />
      </div>

      {filteredMetrics.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="p-8 text-center">
            <BarChart3 className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum dado de performance no período selecionado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {metrics.map((m, idx) => {
            const maxRevenue = metrics[0]?.revenueClosed || 1;
            const revenuePercent = (m.revenueClosed / maxRevenue) * 100;

            return (
              <Card key={m.memberId} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                        idx === 0 ? "bg-amber-100 text-amber-700" :
                        idx === 1 ? "bg-gray-100 text-gray-600" :
                        idx === 2 ? "bg-orange-100 text-orange-700" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {idx < 3 ? <Trophy className="w-4 h-4" /> : idx + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{m.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {m.leadsAccepted} leads aceitos · {m.closed} fechados · {m.lost} perdidos
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-emerald-600">{formatCurrency(m.revenueClosed)}</p>
                      <p className="text-[10px] text-muted-foreground">receita fechada</p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <Progress value={revenuePercent} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-primary shrink-0" />
                      <div>
                        <p className="text-[10px] text-muted-foreground">Conversão</p>
                        <p className="text-sm font-semibold">{m.conversionRate.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-[10px] text-muted-foreground">Ticket Médio</p>
                        <p className="text-sm font-semibold">{formatCurrency(m.ticketMedio)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <div>
                        <p className="text-[10px] text-muted-foreground">Tempo Resposta</p>
                        <p className="text-sm font-semibold">
                          {m.avgResponseTimeHours < 1
                            ? `${Math.round(m.avgResponseTimeHours * 60)}min`
                            : `${m.avgResponseTimeHours.toFixed(1)}h`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                      <div>
                        <p className="text-[10px] text-muted-foreground">Receita Prevista</p>
                        <p className="text-sm font-semibold">{formatCurrency(m.revenuePredicted)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-2 text-[10px] flex-wrap">
                    <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                      {m.leadsAccepted} aceitos
                    </Badge>
                    <span className="text-muted-foreground">→</span>
                    <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                      {m.inNegotiation} negociando
                    </Badge>
                    <span className="text-muted-foreground">→</span>
                    <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                      {m.closed} fechados
                    </Badge>
                    <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">
                      {m.lost} perdidos
                    </Badge>
                  </div>
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
