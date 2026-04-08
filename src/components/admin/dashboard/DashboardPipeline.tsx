import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  formatCurrency, daysSince, formatDays, STATUS_PROBABILITY,
} from "./types";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
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
  if (days === 0) return { text: "Hoje", color: "#16A34A" };
  if (days < 10) return { text: `${days}d`, color: "#6B7280" };
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
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9CA3AF]">
          Propostas
        </p>
        <span className="text-[12px] text-[#9CA3AF]">
          {filtered.length} de {proposals.length}
        </span>
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
          <input
            className="w-full h-9 pl-9 pr-3 text-[13px] text-[#0D0D0D] placeholder:text-[#9CA3AF] bg-[#FFFFFF] border border-[#E5E7EB] rounded-lg outline-none transition-all duration-150 focus:border-[#0EA5E9] focus:shadow-[0_0_0_3px_rgba(14,165,233,0.15)]"
            placeholder="Buscar por nome, cidade ou modelo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filter selects */}
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] h-8 text-[13px] bg-[#F8F9FA] border-[#E5E7EB] rounded-md text-[#6B7280]">
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
            <SelectTrigger className="w-[140px] h-8 text-[13px] bg-[#F8F9FA] border-[#E5E7EB] rounded-md text-[#6B7280]">
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
              <button className="inline-flex items-center gap-1.5 h-8 px-3 text-[13px] bg-[#F8F9FA] border border-[#E5E7EB] rounded-md text-[#6B7280] transition-all duration-150 hover:bg-[#F1F3F5]">
                <CalendarIcon className="w-3.5 h-3.5 text-[#9CA3AF]" />
                <span className="truncate max-w-[120px]">{getDateLabel()}</span>
                {(dateFrom || dateTo) && (
                  <X className="w-3 h-3 ml-auto text-[#9CA3AF] hover:text-[#0D0D0D] shrink-0"
                    onClick={(e) => { e.stopPropagation(); setDateFrom(undefined); setDateTo(undefined); setDatePreset("all"); }} />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end" sideOffset={8}>
              <div className="flex flex-col sm:flex-row">
                <div className="border-b sm:border-b-0 sm:border-r border-[#E5E7EB] p-2 sm:w-[160px] max-h-[260px] overflow-y-auto">
                  <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1.5 px-1">Período</p>
                  <div className="space-y-0.5">
                    <button className={`w-full text-left text-xs px-2 py-1.5 rounded-md transition-all duration-150 ${datePreset === "all" ? "bg-[#0EA5E9] text-white" : "text-[#6B7280] hover:bg-[#F1F3F5]"}`}
                      onClick={() => { applyDatePreset("all"); setDatePopoverOpen(false); }}>Todas</button>
                    {DATE_PRESETS.map((p) => (
                      <button key={p.value}
                        className={`w-full text-left text-xs px-2 py-1.5 rounded-md transition-all duration-150 ${datePreset === p.value ? "bg-[#0EA5E9] text-white" : "text-[#6B7280] hover:bg-[#F1F3F5]"}`}
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
                  <div className="flex justify-end mt-1.5 pt-1.5 border-t border-[#E5E7EB]">
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setDateFrom(undefined); setDateTo(undefined); setDatePreset("all"); setDatePopoverOpen(false); }}>Limpar</Button>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Table container — no outer border, rounded wrapper */}
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-8 h-8 text-[#9CA3AF] mx-auto mb-2" strokeWidth={1.5} />
            <p className="text-[13px] text-[#6B7280]">Nenhuma proposta encontrada</p>
          </div>
        ) : (
          <>
            {/* ── Mobile cards ── */}
            <div className="block md:hidden divide-y divide-[#F3F4F6]">
              {filtered.map((p) => {
                const sc = STATUS_CONFIG[p.status] || STATUS_CONFIG.nova;
                const days = daysSince(p.created_at);
                const ds = formatDaysStyled(days);
                return (
                  <div key={p.id} className="px-4 py-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-medium text-[#0D0D0D] truncate">{p.customer_name}</p>
                        <p className="text-[12px] text-[#9CA3AF] truncate">
                          {p.pool_models?.name || "—"} · {p.customer_city}
                        </p>
                        <p className="text-[12px] text-[#9CA3AF]">
                          {new Date(p.created_at).toLocaleDateString("pt-BR")} · <span style={{ color: ds.color }}>{ds.text}</span>
                        </p>
                      </div>
                      <span className="text-[14px] font-semibold text-[#0D0D0D] whitespace-nowrap tabular-nums">
                        {formatCurrency(p.total_price)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <Select value={p.status} onValueChange={(v) => onUpdateStatus(p.id, v as ProposalStatus)}>
                        <SelectTrigger
                          className="w-auto h-7 text-[12px] font-semibold border-0 rounded-md px-2.5 cursor-pointer"
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
                      <div className="flex gap-1.5">
                        <button
                          className="inline-flex items-center gap-1 h-8 px-3 text-[13px] text-[#6B7280] bg-[#F8F9FA] border border-[#E5E7EB] rounded-md transition-all duration-150 hover:bg-[#F1F3F5]"
                          onClick={() => onViewProposal(p)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          className="inline-flex items-center gap-1 h-8 px-3 text-[13px] text-[#6B7280] bg-[#F8F9FA] border border-[#E5E7EB] rounded-md transition-all duration-150 hover:bg-[#F1F3F5]"
                          onClick={() => onExportPDF(p)}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Desktop table ── */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#F8F9FA] border-b border-[#E5E7EB]">
                    <th className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9CA3AF] h-10 px-4">Cliente</th>
                    <th className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9CA3AF] h-10 px-4">Modelo</th>
                    <th className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9CA3AF] h-10 px-4 text-right">Valor</th>
                    <th className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9CA3AF] h-10 px-4">Status</th>
                    <th className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9CA3AF] h-10 px-4">Data</th>
                    <th className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9CA3AF] h-10 px-4">Dias</th>
                    <th className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9CA3AF] h-10 px-4"></th>
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
                      <tr key={p.id} className="h-[52px] border-b border-[#F3F4F6] transition-all duration-150 hover:bg-[#FAFAFA]">
                        {/* Cliente */}
                        <td className="px-4">
                          <p className="text-[14px] font-medium text-[#0D0D0D]">{p.customer_name}</p>
                          <p className="text-[12px] text-[#9CA3AF]">{p.customer_city}</p>
                        </td>

                        {/* Modelo */}
                        <td className="px-4 text-[14px]">
                          {hasModel
                            ? <span className="text-[#0D0D0D]">{modelName}</span>
                            : <span className="text-[#D1D5DB]">—</span>
                          }
                        </td>

                        {/* Valor */}
                        <td className="px-4 text-[14px] font-semibold text-[#0D0D0D] text-right tabular-nums">
                          {formatCurrency(p.total_price)}
                        </td>

                        {/* Status badge-select */}
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

                        {/* Data */}
                        <td className="px-4 text-[14px] text-[#6B7280] whitespace-nowrap">
                          {new Date(p.created_at).toLocaleDateString("pt-BR")}
                        </td>

                        {/* Dias */}
                        <td className="px-4">
                          <span className="text-[14px] font-medium" style={{ color: ds.color }}>
                            {ds.text}
                          </span>
                        </td>

                        {/* Ações */}
                        <td className="px-4">
                          <div className="flex gap-1.5">
                            <button
                              className="inline-flex items-center gap-1.5 h-8 px-3 text-[13px] text-[#6B7280] bg-[#F8F9FA] border border-[#E5E7EB] rounded-md transition-all duration-150 hover:bg-[#F1F3F5]"
                              onClick={() => onViewProposal(p)}
                            >
                              <Eye className="w-3.5 h-3.5" /> Ver
                            </button>
                            <button
                              className="inline-flex items-center gap-1.5 h-8 px-3 text-[13px] text-[#6B7280] bg-[#F8F9FA] border border-[#E5E7EB] rounded-md transition-all duration-150 hover:bg-[#F1F3F5]"
                              onClick={() => onExportPDF(p)}
                            >
                              <Download className="w-3.5 h-3.5" /> PDF
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DashboardPipeline;
