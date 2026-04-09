import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search, Users, TrendingUp, DollarSign, MapPin, Copy, Calendar, Filter, Download, Eye, Trash2, RefreshCw, Send, CheckCircle2, Bell } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type ProposalStatus = "nova" | "enviada" | "em_negociacao" | "fechada" | "perdida";

interface Lead {
  id: string;
  customer_name: string;
  customer_city: string;
  customer_whatsapp: string;
  total_price: number;
  created_at: string;
  status: ProposalStatus;
  selected_optionals: any;
  store_id: string | null;
  pool_models: { name: string } | null;
  stores: { name: string; city: string | null; state: string | null } | null;
}

interface Distribution {
  id: string;
  proposal_id: string;
  store_id: string;
  status: string;
  accepted_at: string | null;
  created_at: string;
  stores: { name: string; city: string | null } | null;
}

interface StoreOption {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  lead_plan_active: boolean;
  lead_limit_monthly: number;
}

const statusConfig: Record<ProposalStatus, { label: string; color: string }> = {
  nova: { label: "Novo", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  enviada: { label: "Enviado", color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20" },
  em_negociacao: { label: "Em Negociação", color: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20" },
  fechada: { label: "Fechado", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  perdida: { label: "Perdido", color: "bg-red-500/10 text-red-600 border-red-500/20" },
};

const MatrizLeads = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [filterCity, setFilterCity] = useState("all");
  const [filterStore, setFilterStore] = useState("all");
  const [activeTab, setActiveTab] = useState("pendentes");
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [viewingLead, setViewingLead] = useState<Lead | null>(null);
  const [deletingLead, setDeletingLead] = useState<Lead | null>(null);
  const [showDistributeDialog, setShowDistributeDialog] = useState(false);
  const [targetStoreId, setTargetStoreId] = useState("");
  const [distributing, setDistributing] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ count: number; storeName: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [leadsRes, distRes, storesRes] = await Promise.all([
      supabase.from("proposals").select("*, pool_models(name), stores(name, city, state)").is("created_by", null).order("created_at", { ascending: false }).limit(3000),
      (supabase as any).from("lead_distributions").select("*, stores(name, city)").limit(5000),
      (supabase as any).from("stores").select("id, name, city, state, lead_plan_active, lead_limit_monthly").order("name"),
    ]);
    if (leadsRes.data) setLeads(leadsRes.data as Lead[]);
    if (distRes.data) setDistributions(distRes.data);
    if (storesRes.data) setStores(storesRes.data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(), 30000);
    return () => clearInterval(interval);
  }, []);

  // Distribution map - only active (pending/accepted) distributions count
  const distributionMap = new Map<string, Distribution>();
  const expiredDistributions = new Map<string, Distribution[]>();
  distributions.forEach((d: Distribution) => {
    if (d.status === 'expired') {
      const existing = expiredDistributions.get(d.proposal_id) || [];
      existing.push(d);
      expiredDistributions.set(d.proposal_id, existing);
    } else {
      distributionMap.set(d.proposal_id, d);
    }
  });

  // --- Actions ---
  const handleDistribute = async () => {
    if (!targetStoreId || selectedLeads.size === 0) return;
    setDistributing(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Não autenticado"); setDistributing(false); return; }

    // Check duplicates
    const alreadyDistributed = Array.from(selectedLeads).filter(id => distributionMap.has(id));
    if (alreadyDistributed.length > 0) {
      toast.error(`${alreadyDistributed.length} lead(s) já distribuído(s)`);
      setDistributing(false);
      return;
    }

    const inserts = Array.from(selectedLeads).map(proposalId => ({
      proposal_id: proposalId,
      store_id: targetStoreId,
      distributed_by: user.id,
    }));

    const { error } = await (supabase as any).from("lead_distributions").insert(inserts);
    if (error) {
      toast.error("Erro ao distribuir leads");
    } else {
      const storeName = stores.find(s => s.id === targetStoreId)?.name || "Lojista";
      const count = selectedLeads.size;

      // Insert logs
      const logs = Array.from(selectedLeads).map(proposalId => ({
        proposal_id: proposalId,
        store_id: targetStoreId,
        action: "distributed",
        performed_by: user.id,
        details: { count },
      }));
      await (supabase as any).from("lead_logs").insert(logs);

      // Trigger instant push notification for all store members
      const { data: storeOwners } = await supabase
        .from("profiles")
        .select("id")
        .eq("store_id", targetStoreId);

      if (storeOwners?.length) {
        await Promise.all(
          storeOwners.map((owner) =>
            supabase.functions.invoke("notification-engine", {
              body: {
                tipo: "lead_recebido",
                userId: owner.id,
                leadCount: count,
              },
            }).catch((err: any) => console.error("Push notification error:", err))
          )
        );
      }

      setSelectedLeads(new Set());
      setShowDistributeDialog(false);
      setTargetStoreId("");
      setSuccessInfo({ count, storeName });
      setShowSuccessDialog(true);
      loadData();
    }
    setDistributing(false);
  };

  // Status is read-only for Matriz — controlled by the store owner

  const handleDelete = async () => {
    if (!deletingLead) return;
    const { error } = await supabase.from("proposals").delete().eq("id", deletingLead.id);
    if (error) toast.error("Erro ao excluir lead");
    else { setLeads(prev => prev.filter(l => l.id !== deletingLead.id)); toast.success("Lead excluído"); }
    setDeletingLead(null);
  };

  const handleViewLead = async (lead: Lead) => {
    // Resolve optionals if stored as plain UUIDs
    if (Array.isArray(lead.selected_optionals) && lead.selected_optionals.length > 0) {
      const first = lead.selected_optionals[0];
      if (typeof first === "string" && !first.includes("{")) {
        const ids = lead.selected_optionals as string[];
        const [{ data: generalOpts }, { data: modelOpts }] = await Promise.all([
          supabase.from("optionals").select("id, name, price").in("id", ids),
          supabase.from("model_optionals").select("id, name, price").in("id", ids),
        ]);
        const allOpts = [...(generalOpts || []), ...(modelOpts || [])];
        const resolved = ids.map((id: string) => {
          const found = allOpts.find((o: any) => o.id === id);
          return found ? { id: found.id, name: found.name, price: found.price } : { id, name: id, price: 0 };
        });
        setViewingLead({ ...lead, selected_optionals: resolved });
        return;
      }
    }
    setViewingLead(lead);
  };

  const handleCopyPhone = (lead: Lead) => {
    navigator.clipboard.writeText(lead.customer_whatsapp);
    toast.success("Número copiado!");
  };

  const toggleSelect = (id: string) => {
    setSelectedLeads(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (ids: string[]) => {
    setSelectedLeads(prev => {
      const allSelected = ids.every(id => prev.has(id));
      const next = new Set(prev);
      if (allSelected) ids.forEach(id => next.delete(id));
      else ids.forEach(id => next.add(id));
      return next;
    });
  };

  // --- Filters ---
  const now = new Date();
  const filtered = leads.filter(l => {
    if (search) {
      const s = search.toLowerCase();
      if (![l.customer_name, l.customer_city, l.customer_whatsapp, l.pool_models?.name || ""].some(v => v.toLowerCase().includes(s))) return false;
    }
    if (filterStatus !== "all" && l.status !== filterStatus) return false;
    if (filterCity !== "all" && l.customer_city !== filterCity) return false;
    if (filterStore !== "all") {
      const dist = distributionMap.get(l.id);
      if (!dist || dist.stores?.name !== filterStore) return false;
    }
    if (filterPeriod !== "all") {
      const diffDays = (now.getTime() - new Date(l.created_at).getTime()) / 86400000;
      if (filterPeriod === "7d" && diffDays > 7) return false;
      if (filterPeriod === "30d" && diffDays > 30) return false;
      if (filterPeriod === "90d" && diffDays > 90) return false;
    }
    return true;
  });

  const pendentesCount = filtered.filter(l => !distributionMap.has(l.id)).length;
  const distribuidosCount = filtered.filter(l => distributionMap.has(l.id)).length;
  const aceitosCount = filtered.filter(l => {
    const dist = distributionMap.get(l.id);
    return dist && dist.status === 'accepted';
  }).length;

  const tabFiltered = filtered.filter(l => {
    if (activeTab === "pendentes") return !distributionMap.has(l.id);
    if (activeTab === "distribuidos") return distributionMap.has(l.id);
    return true;
  });

  const uniqueCities = [...new Set(leads.map(l => l.customer_city))].sort();
  const selectedCities = [...new Set(Array.from(selectedLeads).map(id => leads.find(l => l.id === id)?.customer_city).filter(Boolean))];
  const activeStores = stores.filter(s => s.lead_plan_active);
  const receitaPotencial = filtered.reduce((sum, l) => sum + l.total_price, 0);
  const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleExportCSV = () => {
    const headers = ["Nome", "Cidade", "WhatsApp", "Piscina", "Valor", "Status", "Distribuído Para", "Data"];
    const rows = tabFiltered.map(l => {
      const dist = distributionMap.get(l.id);
      return [l.customer_name, l.customer_city, l.customer_whatsapp, l.pool_models?.name || "-", l.total_price.toString(), statusConfig[l.status].label, dist ? (dist.stores?.name || "-") : "Não", l.created_at ? format(new Date(l.created_at), "dd/MM/yyyy HH:mm") : "-"];
    });
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `leads-${format(new Date(), "yyyy-MM-dd")}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
  };

  if (loading) return (
    <div className="space-y-4 md:space-y-6">
      <Skeleton className="h-6 w-40 rounded-lg" />
      <div className="grid grid-cols-3 md:grid-cols-5 gap-2 md:gap-4">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[60px] md:h-[80px] rounded-xl" />)}
      </div>
      <Skeleton className="h-[300px] rounded-xl" />
    </div>
  );

  return (
    <div className="space-y-3 md:space-y-6">
      {/* Header — compact on mobile */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-[15px] md:text-[18px] font-semibold text-foreground leading-tight">Gestão de Leads</h1>
          <p className="text-[11px] md:text-[13px] text-muted-foreground hidden md:block">Distribuição e controle centralizado</p>
        </div>
        <div className="flex gap-1.5 md:gap-2 shrink-0">
          {selectedLeads.size > 0 && activeTab === "pendentes" && (
            <Button size="sm" onClick={() => setShowDistributeDialog(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs px-2.5 md:px-3">
              <Send className="w-3.5 h-3.5 mr-1" /> <span className="hidden md:inline">Distribuir </span>({selectedLeads.size})
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={loadData} className="h-8 w-8 md:w-auto p-0 md:px-3">
            <RefreshCw className="w-3.5 h-3.5 md:mr-1" />
            <span className="hidden md:inline">Atualizar</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-8 w-8 md:w-auto p-0 md:px-3">
            <Download className="w-3.5 h-3.5 md:mr-1" />
            <span className="hidden md:inline">CSV</span>
          </Button>
        </div>
      </div>

      {/* KPIs — 3 cols on mobile, tighter */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-2 md:gap-4">
        {[
          { label: "Captados", value: filtered.length, icon: Users, color: "text-muted-foreground" },
          { label: "Aceitos", value: aceitosCount, icon: CheckCircle2, color: "text-cyan-600" },
          { label: "Pendentes", value: pendentesCount, icon: Send, color: "text-amber-600" },
          { label: "Distribuídos", value: distribuidosCount, icon: TrendingUp, color: "text-blue-600" },
          { label: "Receita", value: formatCurrency(receitaPotencial), icon: DollarSign, color: "text-emerald-600", isLast: true },
        ].map((kpi, i) => (
          <Card key={i} className={kpi.isLast ? "col-span-3 md:col-span-1" : ""}>
            <CardContent className="pt-2.5 pb-2 md:pt-4 md:pb-3 px-2.5 md:px-4">
              <div className={`flex items-center gap-1 ${kpi.color} text-[10px] md:text-xs font-medium mb-0.5 md:mb-1`}>
                <kpi.icon className="w-3 h-3 md:w-3.5 md:h-3.5" />
                <span className="truncate">{kpi.label}</span>
              </div>
              <p className={`text-lg md:text-2xl font-bold ${kpi.color} leading-tight`}>
                {typeof kpi.value === "number" ? kpi.value : kpi.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={v => { setActiveTab(v); setSelectedLeads(new Set()); }}>
        <TabsList className="w-full md:w-auto">
          <TabsTrigger value="pendentes" className="flex-1 md:flex-none text-xs md:text-sm">Pend. ({pendentesCount})</TabsTrigger>
          <TabsTrigger value="distribuidos" className="flex-1 md:flex-none text-xs md:text-sm">Distrib. ({distribuidosCount})</TabsTrigger>
          <TabsTrigger value="todos" className="flex-1 md:flex-none text-xs md:text-sm">Todos ({filtered.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters — stacked on mobile */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar nome, cidade, telefone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <Select value={filterCity} onValueChange={setFilterCity}>
            <SelectTrigger className="h-8 text-xs min-w-[110px] w-auto shrink-0"><SelectValue placeholder="Cidade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas cidades</SelectItem>
              {uniqueCities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStore} onValueChange={setFilterStore}>
            <SelectTrigger className="h-8 text-xs min-w-[110px] w-auto shrink-0"><SelectValue placeholder="Loja" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas lojas</SelectItem>
              {stores.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 text-xs min-w-[100px] w-auto shrink-0"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(statusConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterPeriod} onValueChange={setFilterPeriod}>
            <SelectTrigger className="h-8 text-xs min-w-[100px] w-auto shrink-0"><SelectValue placeholder="Período" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo período</SelectItem>
              <SelectItem value="7d">7 dias</SelectItem>
              <SelectItem value="30d">30 dias</SelectItem>
              <SelectItem value="90d">90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Leads List — cards on mobile, table on desktop */}
      {tabFiltered.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhum lead encontrado</p>
        </div>
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="md:hidden space-y-2">
            {activeTab === "pendentes" && tabFiltered.length > 0 && (
              <button
                onClick={() => toggleSelectAll(tabFiltered.map(l => l.id))}
                className="text-xs text-primary font-medium px-1 py-1"
              >
                {tabFiltered.every(l => selectedLeads.has(l.id)) ? "Desmarcar todos" : "Selecionar todos"}
              </button>
            )}
            {tabFiltered.map(lead => {
              const dist = distributionMap.get(lead.id);
              const expired = expiredDistributions.get(lead.id);
              const isSelected = selectedLeads.has(lead.id);
              return (
                <Card
                  key={lead.id}
                  className={`transition-colors ${isSelected ? "ring-1 ring-primary/40 bg-primary/5" : ""}`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      {activeTab === "pendentes" && (
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(lead.id)}
                          className="mt-0.5 shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-sm font-semibold text-foreground truncate">{lead.customer_name}</span>
                          <Badge variant="outline" className={`${statusConfig[lead.status].color} text-[10px] px-1.5 py-0 shrink-0`}>
                            {statusConfig[lead.status].label}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-1.5">
                          <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{lead.customer_city}</span>
                          <span>{lead.created_at ? format(new Date(lead.created_at), "dd/MM HH:mm") : "-"}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground truncate">{lead.pool_models?.name || "-"}</span>
                            <span className="text-xs font-semibold text-emerald-600">{formatCurrency(lead.total_price)}</span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleViewLead(lead)}>
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopyPhone(lead)}>
                              <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeletingLead(lead)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>

                        {dist && (
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground">→ {dist.stores?.name}</span>
                            <Badge variant="outline" className={`text-[9px] px-1 py-0 ${dist.status === "accepted" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"}`}>
                              {dist.status === "accepted" ? "Aceito" : "Aguardando"}
                            </Badge>
                          </div>
                        )}

                        {expired && expired.length > 0 && (
                          <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20 text-[9px] px-1 py-0 mt-1">
                            ↩ Retornou {expired.length}x
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Desktop: table */}
          <Card className="hidden md:block">
            <CardHeader className="pb-2"><CardTitle className="text-base">Leads ({tabFiltered.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    {activeTab === "pendentes" && (
                      <TableHead className="w-10">
                        <Checkbox
                          checked={tabFiltered.length > 0 && tabFiltered.every(l => selectedLeads.has(l.id))}
                          onCheckedChange={() => toggleSelectAll(tabFiltered.map(l => l.id))}
                        />
                      </TableHead>
                    )}
                    <TableHead>Cliente</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>Piscina</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    {activeTab !== "pendentes" && <TableHead>Distribuição</TableHead>}
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tabFiltered.map(lead => {
                    const dist = distributionMap.get(lead.id);
                    const expired = expiredDistributions.get(lead.id);
                    return (
                      <TableRow key={lead.id} className={selectedLeads.has(lead.id) ? "bg-primary/5" : ""}>
                        {activeTab === "pendentes" && (
                          <TableCell><Checkbox checked={selectedLeads.has(lead.id)} onCheckedChange={() => toggleSelect(lead.id)} /></TableCell>
                        )}
                        <TableCell>
                          <div>
                            <span className="font-medium">{lead.customer_name}</span>
                            {expired && expired.length > 0 && (
                              <div className="flex items-center gap-1 mt-1">
                                <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20 text-[10px] px-1.5 py-0">
                                  ↩ Retornou {expired.length}x
                                </Badge>
                                <span className="text-[10px] text-muted-foreground">
                                  últ: {expired[expired.length - 1].stores?.name}
                                </span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{lead.customer_city}</TableCell>
                        <TableCell className="text-sm">{lead.pool_models?.name || "-"}</TableCell>
                        <TableCell className="text-sm font-medium">{formatCurrency(lead.total_price)}</TableCell>
                        <TableCell><Badge variant="outline" className={statusConfig[lead.status].color}>{statusConfig[lead.status].label}</Badge></TableCell>
                        {activeTab !== "pendentes" && (
                          <TableCell>
                            {dist ? (
                              <div className="text-xs space-y-1">
                                <p className="font-medium">{dist.stores?.name}</p>
                                <Badge variant="outline" className={dist.status === "accepted" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"}>
                                  {dist.status === "accepted" ? "Aceito" : "Aguardando"}
                                </Badge>
                                {expired && expired.length > 0 && (
                                  <p className="text-[10px] text-muted-foreground mt-1">
                                    Histórico: {expired.map(e => e.stores?.name).join(" → ")} → {dist.stores?.name}
                                  </p>
                                )}
                              </div>
                            ) : <span className="text-xs text-muted-foreground">—</span>}
                          </TableCell>
                        )}
                        <TableCell className="text-sm text-muted-foreground">{lead.created_at ? format(new Date(lead.created_at), "dd/MM/yy HH:mm", { locale: ptBR }) : "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewLead(lead)}><Eye className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopyPhone(lead)}><Copy className="w-4 h-4 text-muted-foreground" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeletingLead(lead)}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Distribute Dialog */}
      <Dialog open={showDistributeDialog} onOpenChange={setShowDistributeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Distribuir Leads</DialogTitle>
            <DialogDescription>
              Enviar {selectedLeads.size} lead(s) para um lojista parceiro.
              {selectedCities.length > 0 && <span className="block mt-1 text-xs font-medium">Cidades: {selectedCities.join(", ")}</span>}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={targetStoreId} onValueChange={setTargetStoreId}>
              <SelectTrigger><SelectValue placeholder="Selecione o lojista" /></SelectTrigger>
              <SelectContent>
                {activeStores.length === 0 ? (
                  <SelectItem value="_none" disabled>Nenhum lojista com plano ativo</SelectItem>
                ) : (
                  activeStores.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name} {s.city ? `— ${s.city}/${s.state}` : ""}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {targetStoreId && (
              <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                Os dados do lead ficarão <strong>bloqueados</strong> até o lojista aceitar. Após aceitar, o consumo será contabilizado.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDistributeDialog(false)}>Cancelar</Button>
            <Button onClick={handleDistribute} disabled={!targetStoreId || distributing} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {distributing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
              Distribuir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Lead Dialog */}
      <Dialog open={!!viewingLead} onOpenChange={() => setViewingLead(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Lead</DialogTitle>
            <DialogDescription>Informações completas do lead</DialogDescription>
          </DialogHeader>
          {viewingLead && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-muted-foreground">Nome</p><p className="font-medium text-sm">{viewingLead.customer_name}</p></div>
                <div><p className="text-xs text-muted-foreground">WhatsApp</p><p className="font-medium text-sm">{viewingLead.customer_whatsapp}</p></div>
                <div><p className="text-xs text-muted-foreground">Cidade</p><p className="font-medium text-sm flex items-center gap-1"><MapPin className="w-3 h-3" />{viewingLead.customer_city}</p></div>
                <div><p className="text-xs text-muted-foreground">Piscina</p><p className="font-medium text-sm">{viewingLead.pool_models?.name || "-"}</p></div>
                <div><p className="text-xs text-muted-foreground">Valor</p><p className="font-medium text-sm text-emerald-600">{formatCurrency(viewingLead.total_price)}</p></div>
                <div><p className="text-xs text-muted-foreground">Data</p><p className="font-medium text-sm flex items-center gap-1"><Calendar className="w-3 h-3" />{viewingLead.created_at ? format(new Date(viewingLead.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-"}</p></div>
              </div>

              {(() => {
                const dist = distributionMap.get(viewingLead.id);
                if (!dist) return null;
                return (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Distribuição</p>
                    <p className="text-sm font-medium">{dist.stores?.name}</p>
                    <Badge variant="outline" className={dist.status === "accepted" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 mt-1" : "bg-amber-500/10 text-amber-600 border-amber-500/20 mt-1"}>
                      {dist.status === "accepted" ? "Aceito" : "Aguardando aceitação"}
                    </Badge>
                  </div>
                );
              })()}

              {viewingLead.selected_optionals && Array.isArray(viewingLead.selected_optionals) && viewingLead.selected_optionals.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Opcionais</p>
                  <div className="flex flex-wrap gap-1">
                    {viewingLead.selected_optionals.map((opt: any, i: number) => (
                      <Badge key={i} variant="secondary" className="text-xs">{opt.name || opt} {opt.price ? `(${formatCurrency(opt.price)})` : ""}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs text-muted-foreground mb-2">Status Atual</p>
                <Badge variant="outline" className={statusConfig[viewingLead.status]?.color || ""}>
                  {statusConfig[viewingLead.status]?.label || viewingLead.status}
                </Badge>
                <p className="text-[11px] text-muted-foreground mt-1.5">O status é controlado pelo lojista</p>
              </div>

              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => handleCopyPhone(viewingLead)}><Copy className="w-4 h-4 mr-1" /> Copiar Número</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deletingLead} onOpenChange={() => setDeletingLead(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Lead</DialogTitle>
            <DialogDescription>Tem certeza que deseja excluir o lead de <strong>{deletingLead?.customer_name}</strong>? Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingLead(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="max-w-sm text-center">
          <div className="flex flex-col items-center gap-3 py-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <DialogHeader className="text-center">
              <DialogTitle className="text-lg">Leads Distribuídos!</DialogTitle>
              <DialogDescription className="text-sm mt-1">
                {successInfo && (
                  <>
                    <span className="font-semibold text-foreground">{successInfo.count} lead{successInfo.count > 1 ? "s" : ""}</span>
                    {" "}enviado{successInfo.count > 1 ? "s" : ""} para{" "}
                    <span className="font-semibold text-foreground">{successInfo.storeName}</span>
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              <Bell className="w-3.5 h-3.5 text-primary" />
              <span>Notificação push enviada ao lojista</span>
            </div>
            <Button onClick={() => setShowSuccessDialog(false)} className="w-full mt-1" size="sm">
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MatrizLeads;
