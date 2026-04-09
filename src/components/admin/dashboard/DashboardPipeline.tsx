import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Search, Eye, Download, CalendarIcon, X, FileText, ArrowUpDown,
} from "lucide-react";
import {
  Proposal, ProposalStatus, STATUS_CONFIG,
  formatCurrency, daysSince, STATUS_PROBABILITY,
} from "./types";
import { format, startOfDay, endOfDay, subDays, startOfWeek, startOfMonth, endOfMonth, subMonths, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";

type SortMode = "recente" | "valor" | "probabilidade" | "tempo";

interface Props {
  proposals: Proposal[];
  onUpdateStatus: (id: string, status: ProposalStatus) => void;
  onViewProposal: (p: Proposal) => void;
  onExportPDF: (p: Proposal) => void;
}

const DATE_PRESETS = [
  { label: "Hoje", value: "today", getRange: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }) },
  { label: "Ontem", value: "yesterday", getRange: () => ({ from: startOfDay(subDays(new Date(), 1)), to: endOfDay(subDays(new Date(), 1)) }) },
  { label: "Últimos 7 dias", value: "7days", getRange: () => ({ from: startOfDay(subDays(new Date(), 6)), to: endOfDay(new Date()) }) },
  { label: "Últimos 14 dias", value: "14days", getRange: () => ({ from: startOfDay(subDays(new Date(), 13)), to: endOfDay(new Date()) }) },
  { label: "Últimos 30 dias", value: "30days", getRange: () => ({ from: startOfDay(subDays(new Date(), 29)), to: endOfDay(new Date()) }) },
  { label: "Esta semana", value: "thisWeek", getRange: () => ({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfDay(new Date()) }) },
  { label: "Semana passada", value: "lastWeek", getRange: () => { const s = startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }); return { from: s, to: endOfDay(subDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 1)) }; } },
  { label: "Este mês", value: "thisMonth", getRange: () => ({ from: startOfMonth(new Date()), to: endOfDay(new Date()) }) },
  { label: "Mês passado", value: "lastMonth", getRange: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
];

const formatDaysStyled = (days: number): { text: string; color: string } => {
  if (days === 0) return { text: "Hoje", color: "hsl(var(--primary))" };
  if (days < 10) return { text: `${days}d`, color: "hsl(var(--muted-foreground))" };
  if (days < 20) return { text: `${days}d`, color: "#D97706" };
  return { text: `${days}d`, color: "#DC2626" };
};

const DashboardPipeline = ({ proposals, onUpdateStatus, onViewProposal, onExportPDF }: Props) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortMode, setSortMode] = useState<SortMode>("recente");
  const [datePreset, setDatePreset] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  const applyDatePreset = (v: string) => {
    if (v === "all") { setDateFrom(undefined); setDateTo(undefined); setDatePreset("all"); return; }
    const preset = DATE_PRESETS.find((p) => p.value === v);
    if (preset) { const r = preset.getRange(); setDateFrom(r.from); setDateTo(r.to); setDatePreset(v); }
  };

  const getDateLabel = () => {
    if (!dateFrom && !dateTo) return "Todas as datas";
    const preset = DATE_PRESETS.find((p) => p.value === datePreset);
    if (preset) return preset.label;
    const parts: string[] = [];
    if (dateFrom) parts.push(format(dateFrom, "dd/MM/yyyy"));
    if (dateTo) parts.push(format(dateTo, "dd/MM/yyyy"));
    return parts.join(" - ");
  };

  let filtered = proposals;
  if (statusFilter !== "all") filtered = filtered.filter((p) => p.status === statusFilter);
  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter((p) =>
      p.customer_name.toLowerCase().includes(q) ||
      p.customer_city.toLowerCase().includes(q) ||
      p.pool_models?.name?.toLowerCase().includes(q)
    );
  }
  if (dateFrom) filtered = filtered.filter((p) => new Date(p.created_at) >= dateFrom);
  if (dateTo) filtered = filtered.filter((p) => new Date(p.created_at) <= dateTo);

  filtered = [...filtered].sort((a, b) => {
    if (sortMode === "recente") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortMode === "valor") return b.total_price - a.total_price;
    if (sortMode === "probabilidade") return (b.total_price * STATUS_PROBABILITY[b.status]) - (a.total_price * STATUS_PROBABILITY[a.status]);
    return daysSince(b.created_at) - daysSince(a.created_at);
  });

  return (
    <div className="space-y-3">
      {/* Section label */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          Propostas
        </p>
        <span className="text-[12px] text-muted-foreground">
          {filtered.length} de {proposals.length}
        </span>
      </div>

      {/* Search — full width */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          className="w-full h-10 md:h-9 pl-9 pr-3 text-[13px] text-foreground placeholder:text-muted-foreground bg-input border border-border rounded-lg outline-none transition-all duration-150 focus:border-primary focus:ring-[3px] focus:ring-primary/15"
          placeholder="Buscar por nome, cidade ou modelo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Filter row — horizontal scroll on mobile */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-auto min-w-[100px] h-8 text-[13px] bg-input border-border rounded-md text-foreground whitespace-nowrap shrink-0">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
          <SelectTrigger className="w-auto min-w-[110px] h-8 text-[13px] bg-input border-border rounded-md text-foreground whitespace-nowrap shrink-0">
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recente">Recente</SelectItem>
            <SelectItem value="valor">Maior Valor</SelectItem>
            <SelectItem value="probabilidade">Probabilidade</SelectItem>
            <SelectItem value="tempo">Mais Antigo</SelectItem>
          </SelectContent>
        </Select>

        <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
          <PopoverTrigger asChild>
            <button className="inline-flex items-center gap-1.5 h-8 px-3 text-[13px] bg-input border border-border rounded-md text-foreground transition-all duration-150 hover:bg-accent whitespace-nowrap shrink-0">
              <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="truncate max-w-[120px]">{getDateLabel()}</span>
              {(dateFrom || dateTo) && (
                <X className="w-3 h-3 ml-auto text-muted-foreground hover:text-foreground shrink-0"
                  onClick={(e) => { e.stopPropagation(); setDateFrom(undefined); setDateTo(undefined); setDatePreset("all"); }} />
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end" sideOffset={8}>
            <div className="flex flex-col sm:flex-row">
              <div className="border-b sm:border-b-0 sm:border-r border-border p-2 sm:w-[160px] max-h-[260px] overflow-y-auto">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-1">Período</p>
                <div className="space-y-0.5">
                  <button className={`w-full text-left text-xs px-2 py-1.5 rounded-md transition-all duration-150 ${datePreset === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
                    onClick={() => { applyDatePreset("all"); setDatePopoverOpen(false); }}>Todas</button>
                  {DATE_PRESETS.map((p) => (
                    <button key={p.value}
                      className={`w-full text-left text-xs px-2 py-1.5 rounded-md transition-all duration-150 ${datePreset === p.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
                      onClick={() => { applyDatePreset(p.value); setDatePopoverOpen(false); }}>{p.label}</button>
                  ))}
                </div>
              </div>
              <div className="p-2">
                <Calendar mode="range"
                  selected={dateFrom && dateTo ? { from: dateFrom, to: dateTo } : undefined}
                  onSelect={(range) => {
                    setDateFrom(range?.from ? startOfDay(range.from) : undefined);
                    setDateTo(range?.to ? endOfDay(range.to) : undefined);
                    setDatePreset("custom");
                    if (range?.from && range?.to) setDatePopoverOpen(false);
                  }}
                  numberOfMonths={1} locale={ptBR} className="pointer-events-auto" />
                <div className="flex justify-end mt-1.5 pt-1.5 border-t border-border">
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setDateFrom(undefined); setDateTo(undefined); setDatePreset("all"); setDatePopoverOpen(false); }}>Limpar</Button>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Content */}
      <div>
        {filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" strokeWidth={1.5} />
            <p className="text-[13px] text-muted-foreground">Nenhuma proposta encontrada</p>
          </div>
        ) : (
          <>
            {/* ── Mobile cards ── */}
            <div className="block md:hidden space-y-2">
              {filtered.map((p) => {
                const sc = STATUS_CONFIG[p.status] || STATUS_CONFIG.nova;
                const days = daysSince(p.created_at);
                const ds = formatDaysStyled(days);
                const modelName = p.pool_models?.name;
                const hasModel = modelName && modelName !== "N/A" && modelName !== "null";

                return (
                  <div key={p.id} className="bg-card border border-border rounded-xl p-4 space-y-2.5">
                    {/* Row 1: Name + Status badge */}
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[14px] font-semibold text-foreground truncate flex-1">{p.customer_name}</p>
                      <Select value={p.status} onValueChange={(v) => onUpdateStatus(p.id, v as ProposalStatus)}>
                        <SelectTrigger
                          className="w-auto h-auto py-1 px-2.5 text-[12px] font-semibold border-0 rounded-md cursor-pointer inline-flex shrink-0 min-h-0"
                          style={{ backgroundColor: sc.badgeBg, color: sc.badgeText }}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Row 2: City + Days */}
                    <div className="flex items-center justify-between">
                      <p className="text-[12px] text-muted-foreground">{p.customer_city}</p>
                      <span className="text-[12px] font-medium" style={{ color: ds.color }}>{ds.text}</span>
                    </div>

                    {/* Row 3: Model */}
                    <p className="text-[13px] text-muted-foreground">
                      {hasModel ? modelName : <span className="opacity-30">—</span>}
                    </p>

                    {/* Row 4: Price + Actions */}
                    <div className="flex items-center justify-between">
                      <span className="text-[16px] font-bold text-foreground tabular-nums">
                        {formatCurrency(p.total_price)}
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          className="inline-flex items-center gap-1 h-7 px-2.5 text-[12px] text-muted-foreground bg-secondary border border-border rounded-md transition-all duration-150 active:bg-accent min-h-0"
                          onClick={() => onViewProposal(p)}
                        >
                          <Eye className="w-3.5 h-3.5" /> Ver
                        </button>
                        <button
                          className="inline-flex items-center gap-1 h-7 pl-2 pr-1.5 text-[11px] font-semibold text-white bg-[#2d2d2d] rounded-full transition-all duration-150 active:scale-95"
                          onClick={() => onExportPDF(p)}
                        >
                          PDF
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#dc2626]">
                            <Download className="w-2.5 h-2.5 text-white" />
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Desktop table ── */}
            <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-muted border-b border-border">
                      <th className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground h-10 px-4">Cliente</th>
                      <th className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground h-10 px-4">Modelo</th>
                      <th className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground h-10 px-4 text-right">Valor</th>
                      <th className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground h-10 px-4">Status</th>
                      <th className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground h-10 px-4">Data</th>
                      <th className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground h-10 px-4">Dias</th>
                      <th className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground h-10 px-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => {
                      const sc = STATUS_CONFIG[p.status] || STATUS_CONFIG.nova;
                      const days = daysSince(p.created_at);
                      const ds = formatDaysStyled(days);
                      const modelName = p.pool_models?.name;
                      const hasModel = modelName && modelName !== "N/A" && modelName !== "null";

                      return (
                        <tr key={p.id} className="h-[52px] border-b border-border/50 transition-all duration-150 hover:bg-accent/50">
                          <td className="px-4">
                            <p className="text-[14px] font-medium text-foreground">{p.customer_name}</p>
                            <p className="text-[12px] text-muted-foreground">{p.customer_city}</p>
                          </td>
                          <td className="px-4 text-[14px]">
                            {hasModel ? <span className="text-foreground">{modelName}</span> : <span className="opacity-30">—</span>}
                          </td>
                          <td className="px-4 text-[14px] font-semibold text-foreground text-right tabular-nums">
                            {formatCurrency(p.total_price)}
                          </td>
                          <td className="px-4">
                            <Select value={p.status} onValueChange={(v) => onUpdateStatus(p.id, v as ProposalStatus)}>
                              <SelectTrigger
                                className="w-auto h-auto py-1 px-2.5 text-[12px] font-semibold border-0 rounded-md cursor-pointer inline-flex"
                                style={{ backgroundColor: sc.badgeBg, color: sc.badgeText }}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-4 text-[14px] text-muted-foreground whitespace-nowrap">
                            {new Date(p.created_at).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="px-4">
                            <span className="text-[14px] font-medium" style={{ color: ds.color }}>{ds.text}</span>
                          </td>
                          <td className="px-4">
                            <div className="flex gap-1.5">
                              <button
                                className="inline-flex items-center gap-1.5 h-8 px-3 text-[13px] text-muted-foreground bg-secondary border border-border rounded-md transition-all duration-150 hover:bg-accent"
                                onClick={() => onViewProposal(p)}
                              >
                                <Eye className="w-3.5 h-3.5" /> Ver
                              </button>
                              <button
                                className="inline-flex items-center gap-1.5 h-8 pl-3 pr-2 text-[12px] font-semibold text-white bg-[#2d2d2d] rounded-full transition-all duration-150 hover:bg-[#1a1a1a] active:scale-95"
                                onClick={() => onExportPDF(p)}
                              >
                                PDF
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#dc2626]">
                                  <Download className="w-3 h-3 text-white" />
                                </span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DashboardPipeline;
