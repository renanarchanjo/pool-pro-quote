import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStoreData } from "@/hooks/useStoreData";
import { Loader2, CalendarIcon, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import MemberSalesFunnel from "./MemberSalesFunnel";
import { format, startOfMonth, endOfMonth, subDays, subMonths, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "react-day-picker";

interface MemberProfile { id: string; full_name: string | null; }
interface CommissionSetting { id: string; store_id: string; member_id: string; commission_percent: number; }
interface ProposalData { id: string; status: string; total_price: number; created_at: string; customer_name: string; }
interface ProposalDataFull extends ProposalData { created_by: string | null; }
interface LeadDist { id: string; proposal_id: string; accepted_by: string | null; status: string; accepted_at: string | null; created_at: string; }

const DATE_PRESETS = [
  { label: "Mês atual", value: "month", getRange: () => ({ from: startOfMonth(new Date()), to: endOfDay(new Date()) }) },
  { label: "Mês anterior", value: "last_month", getRange: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: "Últimos 30 dias", value: "30d", getRange: () => ({ from: startOfDay(subDays(new Date(), 30)), to: endOfDay(new Date()) }) },
  { label: "Últimos 90 dias", value: "90d", getRange: () => ({ from: startOfDay(subDays(new Date(), 90)), to: endOfDay(new Date()) }) },
];

const formatCurrency = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

const getInitials = (name: string) =>
  name.split(" ").filter(Boolean).map(w => w[0]).join("").toUpperCase().slice(0, 2);

const TeamCommissions = () => {
  const { store, role, profile } = useStoreData();
  const isOwner = role === "owner";

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [commissionSettings, setCommissionSettings] = useState<CommissionSetting[]>([]);
  const [distributions, setDistributions] = useState<LeadDist[]>([]);
  const [proposals, setProposals] = useState<ProposalDataFull[]>([]);
  const [datePreset, setDatePreset] = useState("month");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const r = DATE_PRESETS[0].getRange();
    return { from: r.from, to: r.to };
  });
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => { if (store) loadData(); }, [store]);

  const loadData = async () => {
    if (!store) return;
    setLoading(true);
    try {
      const [membersRes, settingsRes, distRes, proposalsRes] = await Promise.all([
        (supabase as any).from("profiles").select("id, full_name").eq("store_id", store.id),
        supabase.from("commission_settings" as any).select("id, member_id, commission_percent").eq("store_id", store.id),
        supabase.from("lead_distributions").select("id, proposal_id, accepted_by, status, accepted_at, created_at").eq("store_id", store.id),
        supabase.from("proposals").select("id, status, total_price, created_at, customer_name, created_by").eq("store_id", store.id),
      ]);
      if (membersRes.error) console.error("Error loading members:", membersRes.error);
      if (settingsRes.error) console.error("Error loading commission settings:", settingsRes.error);
      if (distRes.error) console.error("Error loading distributions:", distRes.error);
      if (proposalsRes.error) console.error("Error loading proposals:", proposalsRes.error);
      setMembers(membersRes.data || []);
      setCommissionSettings((settingsRes.data as any) || []);
      setDistributions(distRes.data || []);
      setProposals(proposalsRes.data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const applyPreset = (v: string) => {
    setDatePreset(v);
    const preset = DATE_PRESETS.find(p => p.value === v);
    if (preset) { const r = preset.getRange(); setDateRange({ from: r.from, to: r.to }); }
  };

  const dateLabel = dateRange?.from
    ? dateRange.to
      ? `${format(dateRange.from, "dd/MM", { locale: ptBR })} - ${format(dateRange.to, "dd/MM", { locale: ptBR })}`
      : format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
    : "Período";

  const getCommissionPercent = (memberId: string) => {
    const s = commissionSettings.find(s => (s as any).member_id === memberId);
    return s ? (s as any).commission_percent : 0;
  };

  const commissionData = useMemo(() => {
    if (!dateRange?.from) return [];
    const from = dateRange.from;
    const to = dateRange.to || new Date();
    const proposalMap = new Map<string, ProposalDataFull>();
    proposals.forEach(p => proposalMap.set(p.id, p));
    const visibleMembers = isOwner ? members : members.filter(m => m.id === profile?.id);

    return visibleMembers.map(member => {
      const acceptedIds = new Set(
        distributions.filter(d => d.accepted_by === member.id && d.status === "accepted").map(d => d.proposal_id)
      );
      const allProposals = Array.from(proposalMap.values());
      // IDs de propostas que têm lead_distribution (qualquer status)
      const proposalsWithDistribution = new Set(distributions.map(d => d.proposal_id));
      const memberProposalIds = new Set<string>(acceptedIds);
      // Fallback: só creditar por created_by se NÃO existe lead_distribution para essa proposta
      allProposals.forEach(p => {
        if ((p as any).created_by === member.id && !proposalsWithDistribution.has(p.id)) {
          memberProposalIds.add(p.id);
        }
      });
      const memberProposals = Array.from(memberProposalIds).map(id => proposalMap.get(id)).filter(Boolean) as ProposalDataFull[];
      const inRange = memberProposals.filter(p => { const dt = new Date(p.created_at); return dt >= from && dt <= to; });
      const nova = inRange.filter(p => p.status === "nova");
      const enviada = inRange.filter(p => p.status === "enviada");
      const inNeg = inRange.filter(p => p.status === "em_negociacao");
      const closed = inRange.filter(p => p.status === "fechada");
      const lost = inRange.filter(p => p.status === "perdida");
      const revenueClosed = closed.reduce((s, p) => s + p.total_price, 0);
      const cp = getCommissionPercent(member.id);
      const commissionValue = revenueClosed * (cp / 100);
      const totalDecided = closed.length + lost.length;
      const conversionRate = totalDecided > 0 ? (closed.length / totalDecided) * 100 : 0;
      const ticketMedio = closed.length > 0 ? revenueClosed / closed.length : 0;

      return {
        memberId: member.id, name: member.full_name || "Sem nome",
        totalProposals: inRange.length, nova: nova.length, enviada: enviada.length,
        inNegotiation: inNeg.length, closed: closed.length, lost: lost.length,
        revenueNova: nova.reduce((s, p) => s + p.total_price, 0),
        revenueEnviada: enviada.reduce((s, p) => s + p.total_price, 0),
        revenueNeg: inNeg.reduce((s, p) => s + p.total_price, 0),
        revenueClosed, revenueLost: lost.reduce((s, p) => s + p.total_price, 0),
        commissionPercent: cp, commissionValue, conversionRate, ticketMedio,
        closedProposals: closed.map(p => ({
          name: p.customer_name, value: p.total_price, commission: p.total_price * (cp / 100), date: p.created_at,
        })),
      };
    }).filter(m => isOwner || m.totalProposals > 0 || m.commissionPercent > 0)
      .sort((a, b) => b.commissionValue - a.commissionValue);
  }, [members, distributions, proposals, commissionSettings, dateRange, isOwner, profile]);

  const teamTotals = useMemo(() =>
    commissionData.reduce((acc, m) => ({
      revenue: acc.revenue + m.revenueClosed, commission: acc.commission + m.commissionValue, closed: acc.closed + m.closed,
    }), { revenue: 0, commission: 0, closed: 0 }), [commissionData]);

  if (loading) return <div className="space-y-3 animate-in fade-in"><div className="h-8 bg-muted rounded animate-pulse w-40" /><div className="space-y-2">{Array.from({length:3}).map((_,i)=><div key={i} className="h-16 bg-muted rounded animate-pulse" />)}</div></div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-[18px] font-semibold text-foreground">Comissões</h3>
          <p className="text-[13px] text-muted-foreground">
            {isOwner ? "Gerencie as comissões da equipe" : "Acompanhe suas comissões"}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
                <CalendarIcon className="w-3 h-3" />{dateLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="range" selected={dateRange} onSelect={(range) => {
                setDateRange(range); setDatePreset("custom");
                if (range?.from && range?.to) setCalendarOpen(false);
              }} numberOfMonths={2} locale={ptBR} className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Owner summary cards */}
      {isOwner && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-card px-4 py-4 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Vendas Fechadas</p>
            <p className="text-[22px] font-bold text-foreground mt-1">{teamTotals.closed}</p>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-4 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Receita Total</p>
            <p className="text-[22px] font-bold text-foreground mt-1">{formatCurrency(teamTotals.revenue)}</p>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-4 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Total Comissões</p>
            <p className="text-[22px] font-bold text-primary mt-1">{formatCurrency(teamTotals.commission)}</p>
          </div>
        </div>
      )}

      {commissionData.length === 0 ? (
        <Card className="border border-border rounded-xl">
          <CardContent className="p-8 text-center">
            <DollarSign className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum dado de comissão no período selecionado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {commissionData.map((m, idx) => {
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
                      <span
                        className="inline-flex items-center text-[12px] font-semibold rounded-md px-2.5 py-0.5 mt-0.5 bg-primary/10 text-primary"
                      >
                        {m.commissionPercent}% comissão
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[16px] font-bold text-foreground">{formatCurrency(m.commissionValue)}</p>
                    <p className="text-[11px] text-muted-foreground">comissão</p>
                  </div>
                </div>

                {/* Separator */}
                <div className="border-t border-border my-3" />

                {/* Metrics grid 2x2 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Receita Fechada</p>
                    <p className="text-[18px] font-bold text-foreground">{formatCurrency(m.revenueClosed)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Conversão</p>
                    <p className="text-[18px] font-bold text-foreground">{m.conversionRate.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Ticket Médio</p>
                    <p className="text-[18px] font-bold text-foreground">{formatCurrency(m.ticketMedio)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Fechamentos</p>
                    <p className="text-[18px] font-bold text-foreground">{m.closed}</p>
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

                {/* Closed proposals detail */}
                {m.closedProposals.length > 0 && (
                  <div className="pt-3 mt-3 border-t border-border">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground mb-2">Vendas fechadas no período</p>
                    <div className="space-y-1.5">
                      {m.closedProposals.map((cp, i) => (
                        <div key={i} className="flex items-center justify-between text-[13px] bg-accent/50 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium text-foreground truncate">{cp.name}</span>
                            <span className="text-muted-foreground shrink-0">{new Date(cp.date).toLocaleDateString("pt-BR")}</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="font-semibold text-foreground">{formatCurrency(cp.value)}</span>
                            <span className="text-primary font-semibold">+{formatCurrency(cp.commission)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TeamCommissions;
