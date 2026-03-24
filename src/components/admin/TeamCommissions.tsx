import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStoreData } from "@/hooks/useStoreData";
import { toast } from "sonner";
import {
  Loader2, DollarSign, TrendingUp, Target, Trophy, CalendarIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, subDays, subMonths, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "react-day-picker";

interface MemberProfile { id: string; full_name: string | null; }
interface CommissionSetting { id: string; store_id: string; member_id: string; commission_percent: number; }
interface ProposalData { id: string; status: string; total_price: number; created_at: string; customer_name: string; }
interface LeadDist { id: string; proposal_id: string; accepted_by: string | null; status: string; accepted_at: string | null; created_at: string; }

const DATE_PRESETS = [
  { label: "Mês atual", value: "month", getRange: () => ({ from: startOfMonth(new Date()), to: endOfDay(new Date()) }) },
  { label: "Mês anterior", value: "last_month", getRange: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: "Últimos 30 dias", value: "30d", getRange: () => ({ from: startOfDay(subDays(new Date(), 30)), to: endOfDay(new Date()) }) },
  { label: "Últimos 90 dias", value: "90d", getRange: () => ({ from: startOfDay(subDays(new Date(), 90)), to: endOfDay(new Date()) }) },
];

const formatCurrency = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

const TeamCommissions = () => {
  const { store, role, profile } = useStoreData();
  const isOwner = role === "owner";

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [commissionSettings, setCommissionSettings] = useState<CommissionSetting[]>([]);
  const [distributions, setDistributions] = useState<LeadDist[]>([]);
  const [proposals, setProposals] = useState<ProposalData[]>([]);
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
        supabase.from("commission_settings" as any).select("*").eq("store_id", store.id),
        supabase.from("lead_distributions").select("id, proposal_id, accepted_by, status, accepted_at, created_at").eq("store_id", store.id),
        supabase.from("proposals").select("id, status, total_price, created_at, customer_name").eq("store_id", store.id),
      ]);
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
    const proposalMap = new Map<string, ProposalData>();
    proposals.forEach(p => proposalMap.set(p.id, p));
    const visibleMembers = isOwner ? members : members.filter(m => m.id === profile?.id);

    return visibleMembers.map(member => {
      const accepted = distributions.filter(d => d.accepted_by === member.id && d.status === "accepted");
      const memberProposals = accepted.map(d => proposalMap.get(d.proposal_id)).filter(Boolean) as ProposalData[];
      const inRange = memberProposals.filter(p => { const dt = new Date(p.created_at); return dt >= from && dt <= to; });
      const closed = inRange.filter(p => p.status === "fechada");
      const lost = inRange.filter(p => p.status === "perdida");
      const inNeg = inRange.filter(p => p.status === "em_negociacao");
      const revenueClosed = closed.reduce((s, p) => s + p.total_price, 0);
      const cp = getCommissionPercent(member.id);
      const commissionValue = revenueClosed * (cp / 100);
      const totalDecided = closed.length + lost.length;
      const conversionRate = totalDecided > 0 ? (closed.length / totalDecided) * 100 : 0;
      const ticketMedio = closed.length > 0 ? revenueClosed / closed.length : 0;

      return {
        memberId: member.id, name: member.full_name || "Sem nome",
        totalProposals: inRange.length, closed: closed.length, lost: lost.length, inNegotiation: inNeg.length,
        revenueClosed, commissionPercent: cp, commissionValue, conversionRate, ticketMedio,
        closedProposals: closed.map(p => ({
          name: p.customer_name, value: p.total_price, commission: p.total_price * (cp / 100),
          date: p.created_at,
        })),
      };
    }).filter(m => isOwner || m.totalProposals > 0 || m.commissionPercent > 0)
      .sort((a, b) => b.commissionValue - a.commissionValue);
  }, [members, distributions, proposals, commissionSettings, dateRange, isOwner, profile]);

  const teamTotals = useMemo(() =>
    commissionData.reduce((acc, m) => ({
      revenue: acc.revenue + m.revenueClosed, commission: acc.commission + m.commissionValue, closed: acc.closed + m.closed,
    }), { revenue: 0, commission: 0, closed: 0 }), [commissionData]);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">Comissões</h3>
          <p className="text-xs text-muted-foreground">{isOwner ? "Gerencie as comissões da equipe" : "Acompanhe suas comissões"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={datePreset} onValueChange={applyPreset}>
            <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DATE_PRESETS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
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

      {isOwner && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-card px-4 py-4 text-center">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Vendas Fechadas</p>
            <p className="text-2xl font-bold mt-2">{teamTotals.closed}</p>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-4 text-center">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Receita Total</p>
            <p className="text-2xl font-bold mt-2 text-emerald-600">{formatCurrency(teamTotals.revenue)}</p>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-4 text-center">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Total Comissões</p>
            <p className="text-2xl font-bold mt-2 text-primary">{formatCurrency(teamTotals.commission)}</p>
          </div>
        </div>
      )}

      {commissionData.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="p-8 text-center">
            <DollarSign className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum dado de comissão no período selecionado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {commissionData.map((m, idx) => (
            <Card key={m.memberId} className="border-border/50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                      idx === 0 ? "bg-amber-100 text-amber-700" : idx === 1 ? "bg-gray-100 text-gray-600" :
                      idx === 2 ? "bg-orange-100 text-orange-700" : "bg-muted text-muted-foreground"
                    )}>
                      {idx < 3 ? <Trophy className="w-4 h-4" /> : idx + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{m.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                          {m.commissionPercent}% comissão
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-primary">{formatCurrency(m.commissionValue)}</p>
                    <p className="text-[10px] text-muted-foreground">comissão</p>
                  </div>
                </div>

                {commissionData[0]?.revenueClosed > 0 && (
                  <Progress value={(m.revenueClosed / commissionData[0].revenueClosed) * 100} className="h-2" />
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <div><p className="text-[10px] text-muted-foreground">Receita Fechada</p><p className="text-sm font-semibold">{formatCurrency(m.revenueClosed)}</p></div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-primary shrink-0" />
                    <div><p className="text-[10px] text-muted-foreground">Conversão</p><p className="text-sm font-semibold">{m.conversionRate.toFixed(1)}%</p></div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                    <div><p className="text-[10px] text-muted-foreground">Ticket Médio</p><p className="text-sm font-semibold">{formatCurrency(m.ticketMedio)}</p></div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <div><p className="text-[10px] text-muted-foreground">Fechamentos</p><p className="text-sm font-semibold">{m.closed}</p></div>
                  </div>
                </div>

                <div className="pt-3 border-t border-border/50 flex items-center gap-2 text-[10px] flex-wrap">
                  <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">{m.totalProposals} propostas</Badge>
                  <span className="text-muted-foreground">→</span>
                  <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">{m.inNegotiation} negociando</Badge>
                  <span className="text-muted-foreground">→</span>
                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">{m.closed} fechados</Badge>
                  <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">{m.lost} perdidos</Badge>
                </div>

                {m.closedProposals.length > 0 && (
                  <div className="pt-3 border-t border-border/50">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Vendas fechadas no período</p>
                    <div className="space-y-1.5">
                      {m.closedProposals.map((cp, i) => (
                        <div key={i} className="flex items-center justify-between text-xs bg-muted/50 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium truncate">{cp.name}</span>
                            <span className="text-muted-foreground shrink-0">{new Date(cp.date).toLocaleDateString("pt-BR")}</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="font-semibold">{formatCurrency(cp.value)}</span>
                            <span className="text-primary font-semibold">+{formatCurrency(cp.commission)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeamCommissions;