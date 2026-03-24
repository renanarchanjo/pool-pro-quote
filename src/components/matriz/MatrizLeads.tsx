import { useEffect, useState } from "react";
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
import { Loader2, Search, Users, TrendingUp, DollarSign, MapPin, Copy, Calendar, Filter, Download, Eye, Trash2, RefreshCw, Send } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState("pendentes");
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [viewingLead, setViewingLead] = useState<Lead | null>(null);
  const [deletingLead, setDeletingLead] = useState<Lead | null>(null);
  const [showDistributeDialog, setShowDistributeDialog] = useState(false);
  const [targetStoreId, setTargetStoreId] = useState("");
  const [distributing, setDistributing] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ count: number; storeName: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [leadsRes, distRes, storesRes] = await Promise.all([
      supabase.from("proposals").select("*, pool_models(name), stores(name, city, state)").order("created_at", { ascending: false }),
      (supabase as any).from("lead_distributions").select("*, stores(name, city)"),
      (supabase as any).from("stores").select("id, name, city, state, lead_plan_active, lead_limit_monthly").order("name"),
    ]);
    if (leadsRes.data) setLeads(leadsRes.data as Lead[]);
    if (distRes.data) setDistributions(distRes.data);
    if (storesRes.data) setStores(storesRes.data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const channel = supabase
      .channel("matriz-leads-all")
      .on("postgres_changes", { event: "*", schema: "public", table: "proposals" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "lead_distributions" }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Distribution map
  const distributionMap = new Map<string, Distribution>();
  distributions.forEach((d: Distribution) => distributionMap.set(d.proposal_id, d));

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
      // Insert logs
      const logs = Array.from(selectedLeads).map(proposalId => ({
        proposal_id: proposalId,
        store_id: targetStoreId,
        action: "distributed",
        performed_by: user.id,
        details: { count: selectedLeads.size },
      }));
      await (supabase as any).from("lead_logs").insert(logs);

      // Trigger instant push notification for all store members
      const { data: storeOwners } = await supabase
        .from("profiles")
        .select("id")
        .eq("store_id", targetStoreId);

      if (storeOwners?.length) {
        const leadCount = selectedLeads.size;
        await Promise.all(
          storeOwners.map((owner) =>
            supabase.functions.invoke("notification-engine", {
              body: {
                tipo: "lead_recebido",
                userId: owner.id,
                leadCount,
              },
            }).catch((err: any) => console.error("Push notification error:", err))
          )
        );
      }

      toast.success(`${selectedLeads.size} lead(s) distribuído(s) com sucesso!`);
      setSelectedLeads(new Set());
      setShowDistributeDialog(false);
      setTargetStoreId("");
      loadData();
    }
    setDistributing(false);
  };

  const handleUpdateStatus = async (id: string, newStatus: ProposalStatus) => {
    setUpdatingStatus(id);
    const { error } = await supabase.from("proposals").update({ status: newStatus }).eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar status");
    } else {
      setLeads(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l));
      toast.success("Status atualizado");
      if (viewingLead?.id === id) setViewingLead(prev => prev ? { ...prev, status: newStatus } : null);
    }
    setUpdatingStatus(null);
  };

  const handleDelete = async () => {
    if (!deletingLead) return;
    const { error } = await supabase.from("proposals").delete().eq("id", deletingLead.id);
    if (error) toast.error("Erro ao excluir lead");
    else { setLeads(prev => prev.filter(l => l.id !== deletingLead.id)); toast.success("Lead excluído"); }
    setDeletingLead(null);
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

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestão de Leads</h1>
          <p className="text-sm text-muted-foreground">Distribuição e controle centralizado</p>
        </div>
        <div className="flex gap-2">
          {selectedLeads.size > 0 && activeTab === "pendentes" && (
            <Button size="sm" onClick={() => setShowDistributeDialog(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Send className="w-4 h-4 mr-1" /> Distribuir ({selectedLeads.size})
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={loadData}><RefreshCw className="w-4 h-4 mr-1" /> Atualizar</Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV}><Download className="w-4 h-4 mr-1" /> CSV</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1"><Users className="w-3.5 h-3.5" /> Total</div>
          <p className="text-2xl font-bold">{filtered.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-amber-600 text-xs font-medium mb-1"><Send className="w-3.5 h-3.5" /> Pendentes</div>
          <p className="text-2xl font-bold text-amber-600">{pendentesCount}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-blue-600 text-xs font-medium mb-1"><TrendingUp className="w-3.5 h-3.5" /> Distribuídos</div>
          <p className="text-2xl font-bold text-blue-600">{distribuidosCount}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-emerald-600 text-xs font-medium mb-1"><DollarSign className="w-3.5 h-3.5" /> Receita Potencial</div>
          <p className="text-2xl font-bold text-emerald-600">{formatCurrency(receitaPotencial)}</p>
        </CardContent></Card>
      </div>

      {/* Tabs + Filters */}
      <div className="space-y-3">
        <Tabs value={activeTab} onValueChange={v => { setActiveTab(v); setSelectedLeads(new Set()); }}>
          <TabsList>
            <TabsTrigger value="pendentes">Pendentes ({pendentesCount})</TabsTrigger>
            <TabsTrigger value="distribuidos">Distribuídos ({distribuidosCount})</TabsTrigger>
            <TabsTrigger value="todos">Todos ({filtered.length})</TabsTrigger>
          </TabsList>
        </Tabs>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground"><Filter className="w-4 h-4" /> Filtros:</div>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar nome, cidade, telefone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9" />
            </div>
            <Select value={filterCity} onValueChange={setFilterCity}>
              <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Cidade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas cidades</SelectItem>
                {uniqueCities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(statusConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterPeriod} onValueChange={setFilterPeriod}>
              <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Período" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo período</SelectItem>
                <SelectItem value="7d">7 dias</SelectItem>
                <SelectItem value="30d">30 dias</SelectItem>
                <SelectItem value="90d">90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent></Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Leads ({tabFiltered.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {tabFiltered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground"><Users className="w-10 h-10 mx-auto mb-2 opacity-40" /><p>Nenhum lead encontrado</p></div>
          ) : (
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
                  return (
                    <TableRow key={lead.id} className={selectedLeads.has(lead.id) ? "bg-primary/5" : ""}>
                      {activeTab === "pendentes" && (
                        <TableCell><Checkbox checked={selectedLeads.has(lead.id)} onCheckedChange={() => toggleSelect(lead.id)} /></TableCell>
                      )}
                      <TableCell className="font-medium">{lead.customer_name}</TableCell>
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
                            </div>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                      )}
                      <TableCell className="text-sm text-muted-foreground">{lead.created_at ? format(new Date(lead.created_at), "dd/MM/yy HH:mm", { locale: ptBR }) : "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewingLead(lead)}><Eye className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopyPhone(lead)}><Copy className="w-4 h-4 text-muted-foreground" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeletingLead(lead)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Distribute Dialog */}
      <Dialog open={showDistributeDialog} onOpenChange={setShowDistributeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Distribuir Leads</DialogTitle>
            <DialogDescription>
              Enviar {selectedLeads.size} lead(s) para um lojista parceiro.
              {selectedCities.length > 0 && <span className="block mt-1 text-xs font-medium">Cidades dos leads: {selectedCities.join(", ")}</span>}
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
                <div><p className="text-xs text-muted-foreground">Nome</p><p className="font-medium">{viewingLead.customer_name}</p></div>
                <div><p className="text-xs text-muted-foreground">WhatsApp</p><p className="font-medium">{viewingLead.customer_whatsapp}</p></div>
                <div><p className="text-xs text-muted-foreground">Cidade</p><p className="font-medium flex items-center gap-1"><MapPin className="w-3 h-3" />{viewingLead.customer_city}</p></div>
                <div><p className="text-xs text-muted-foreground">Piscina</p><p className="font-medium">{viewingLead.pool_models?.name || "-"}</p></div>
                <div><p className="text-xs text-muted-foreground">Valor</p><p className="font-medium text-emerald-600">{formatCurrency(viewingLead.total_price)}</p></div>
                <div><p className="text-xs text-muted-foreground">Data</p><p className="font-medium flex items-center gap-1"><Calendar className="w-3 h-3" />{viewingLead.created_at ? format(new Date(viewingLead.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-"}</p></div>
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
                <p className="text-xs text-muted-foreground mb-2">Alterar Status</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(statusConfig).map(([key, cfg]) => (
                    <Button key={key} size="sm" variant={viewingLead.status === key ? "default" : "outline"} className="text-xs h-7" disabled={updatingStatus === viewingLead.id} onClick={() => handleUpdateStatus(viewingLead.id, key as ProposalStatus)}>
                      {cfg.label}
                    </Button>
                  ))}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => handleCopyPhone(viewingLead)}><Copy className="w-4 h-4 mr-1" /> Copiar Número</Button>
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
    </div>
  );
};

export default MatrizLeads;
