import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Search, Eye, Download, Pencil, CalendarIcon, X, FileText, ArrowUpDown,
} from "lucide-react";
import {
  Proposal, ProposalStatus, STATUS_CONFIG, PRIORITY_CONFIG,
  formatCurrency, getPriority, daysSince, STATUS_PROBABILITY,
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

  // Filter
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

  // Sort
  filtered = [...filtered].sort((a, b) => {
    if (sortMode === "recente") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortMode === "valor") return b.total_price - a.total_price;
    if (sortMode === "probabilidade") return (b.total_price * STATUS_PROBABILITY[b.status]) - (a.total_price * STATUS_PROBABILITY[a.status]);
    return daysSince(b.created_at) - daysSince(a.created_at);
  });

  return (
    <div className="space-y-2 sm:space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <span className="hidden sm:inline">Controle e Acompanhamento de Propostas</span>
          <span className="sm:hidden">Propostas</span>
        </h3>
        <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
          {filtered.length} de {proposals.length}
        </span>
      </div>

      {/* Filters */}
      <div className="space-y-1.5 sm:space-y-0 sm:flex sm:flex-row sm:gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9 h-8 sm:h-9 text-sm" placeholder="Buscar nome, cidade..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1.5">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="flex-1 sm:w-[130px] h-8 sm:h-9 text-xs">
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
            <SelectTrigger className="flex-1 sm:w-[140px] h-8 sm:h-9 text-xs">
              <div className="flex items-center gap-1">
                <ArrowUpDown className="w-3 h-3" />
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

        {/* Date Filter */}
          <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex-1 sm:flex-none justify-start text-left font-normal gap-1.5 h-8 sm:h-9 text-xs">
                <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="truncate">{getDateLabel()}</span>
                {(dateFrom || dateTo) && (
                  <X className="w-3 h-3 ml-auto text-muted-foreground hover:text-foreground shrink-0"
                    onClick={(e) => { e.stopPropagation(); setDateFrom(undefined); setDateTo(undefined); setDatePreset("all"); }} />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end" sideOffset={8}>
              <div className="flex flex-col sm:flex-row">
                <div className="border-b sm:border-b-0 sm:border-r border-border p-2 sm:w-[160px] max-h-[260px] overflow-y-auto">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-1">Período</p>
                  <div className="space-y-0.5">
                    <button className={`w-full text-left text-xs px-2 py-1.5 rounded-md transition-colors ${datePreset === "all" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                      onClick={() => { applyDatePreset("all"); setDatePopoverOpen(false); }}>Todas</button>
                    {DATE_PRESETS.map((p) => (
                      <button key={p.value}
                        className={`w-full text-left text-xs px-2 py-1.5 rounded-md transition-colors ${datePreset === p.value ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
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
      </div>

      {/* Proposals */}
      <Card className="border-border/50 overflow-hidden">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma proposta encontrada</p>
            </div>
          ) : (
            <>
              {/* Mobile */}
               <div className="block md:hidden space-y-0 divide-y divide-border">
                {filtered.map((p) => {
                  const sc = STATUS_CONFIG[p.status] || STATUS_CONFIG.nova;
                  const priority = getPriority(p);
                  const pc = PRIORITY_CONFIG[priority];
                  const days = daysSince(p.created_at);
                  return (
                    <div key={p.id} className="px-2.5 py-2 space-y-1.5">
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${pc.dot}`} />
                            <p className="font-semibold text-xs truncate">{p.customer_name}</p>
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {p.pool_models?.name || "N/A"} · {p.customer_city}
                          </p>
                          <p className="text-[9px] text-muted-foreground">
                            {new Date(p.created_at).toLocaleDateString("pt-BR")} · {days}d
                          </p>
                        </div>
                        <span className="font-bold text-primary text-xs whitespace-nowrap">
                          {formatCurrency(p.total_price)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-1.5">
                        <Select value={p.status} onValueChange={(v) => onUpdateStatus(p.id, v as ProposalStatus)}>
                          <SelectTrigger className={`w-[110px] h-7 text-[10px] font-medium border ${sc.className}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => onViewProposal(p)}>
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => onExportPDF(p)}>
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>CLIENTE</TableHead>
                      <TableHead>MODELO</TableHead>
                      <TableHead>VALOR</TableHead>
                      <TableHead>STATUS</TableHead>
                      <TableHead>DATA</TableHead>
                      <TableHead>DIAS</TableHead>
                      <TableHead>AÇÕES</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((p) => {
                      const sc = STATUS_CONFIG[p.status] || STATUS_CONFIG.nova;
                      const priority = getPriority(p);
                      const pc = PRIORITY_CONFIG[priority];
                      const days = daysSince(p.created_at);
                      return (
                        <TableRow key={p.id} className={priority === "alta" ? "bg-red-50/30 dark:bg-red-950/10" : ""}>
                          <TableCell className="pr-0">
                            <div className={`w-2 h-2 rounded-full ${pc.dot}`} title={`Prioridade ${pc.label}`} />
                          </TableCell>
                          <TableCell>
                            <p className="font-semibold text-sm">{p.customer_name}</p>
                            <p className="text-xs text-muted-foreground">{p.customer_city}</p>
                          </TableCell>
                          <TableCell className="text-sm">{p.pool_models?.name || "N/A"}</TableCell>
                          <TableCell className="font-bold text-primary whitespace-nowrap text-sm">
                            {formatCurrency(p.total_price)}
                          </TableCell>
                          <TableCell>
                            <Select value={p.status} onValueChange={(v) => onUpdateStatus(p.id, v as ProposalStatus)}>
                              <SelectTrigger className={`w-[140px] h-7 text-xs font-medium border ${sc.className}`}>
                                <div className="flex items-center gap-1">
                                  <Pencil className="w-3 h-3" />
                                  <SelectValue />
                                </div>
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(p.created_at).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell>
                            <span className={`text-xs font-medium ${days > 7 ? "text-red-500" : days > 3 ? "text-amber-500" : "text-muted-foreground"}`}>
                              {days}d
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1.5">
                              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onViewProposal(p)}>
                                <Eye className="w-3 h-3" /> Ver
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onExportPDF(p)}>
                                <Download className="w-3 h-3" /> PDF
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPipeline;
