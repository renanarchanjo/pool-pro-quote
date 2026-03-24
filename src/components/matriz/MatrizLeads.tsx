import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Search, Users, TrendingUp, DollarSign, MapPin, Copy, Calendar, Filter, Download, Eye, Trash2, RefreshCw } from "lucide-react";
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

interface Store {
  id: string;
  name: string;
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
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStore, setFilterStore] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [viewingLead, setViewingLead] = useState<Lead | null>(null);
  const [deletingLead, setDeletingLead] = useState<Lead | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [leadsRes, storesRes] = await Promise.all([
      supabase
        .from("proposals")
        .select("*, pool_models(name), stores(name, city, state)")
        .order("created_at", { ascending: false }),
      supabase.from("stores").select("id, name").order("name"),
    ]);

    if (leadsRes.data) setLeads(leadsRes.data as Lead[]);
    if (storesRes.data) setStores(storesRes.data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel("matriz-leads")
      .on("postgres_changes", { event: "*", schema: "public", table: "proposals" }, () => {
        loadData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

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
    if (error) {
      toast.error("Erro ao excluir lead");
    } else {
      setLeads(prev => prev.filter(l => l.id !== deletingLead.id));
      toast.success("Lead excluído");
    }
    setDeletingLead(null);
  };

  const handleWhatsApp = (lead: Lead) => {
    const phone = lead.customer_whatsapp.replace(/\D/g, "");
    window.open(`https://wa.me/55${phone}`, "_blank");
  };

  // Filters
  const now = new Date();
  const filtered = leads.filter(l => {
    if (search) {
      const s = search.toLowerCase();
      const match = l.customer_name.toLowerCase().includes(s) ||
        l.customer_city.toLowerCase().includes(s) ||
        l.customer_whatsapp.includes(s) ||
        l.pool_models?.name?.toLowerCase().includes(s) ||
        l.stores?.name?.toLowerCase().includes(s);
      if (!match) return false;
    }
    if (filterStore !== "all" && l.store_id !== filterStore) return false;
    if (filterStatus !== "all" && l.status !== filterStatus) return false;
    if (filterPeriod !== "all") {
      const created = new Date(l.created_at!);
      const diffDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
      if (filterPeriod === "7d" && diffDays > 7) return false;
      if (filterPeriod === "30d" && diffDays > 30) return false;
      if (filterPeriod === "90d" && diffDays > 90) return false;
    }
    return true;
  });

  // KPIs
  const totalLeads = filtered.length;
  const leadsNovos = filtered.filter(l => l.status === "nova").length;
  const leadsFechados = filtered.filter(l => l.status === "fechada").length;
  const leadsPerdidos = filtered.filter(l => l.status === "perdida").length;
  const receitaPotencial = filtered.reduce((sum, l) => sum + l.total_price, 0);
  const receitaFechada = filtered.filter(l => l.status === "fechada").reduce((sum, l) => sum + l.total_price, 0);
  const taxaConversao = totalLeads > 0 ? ((leadsFechados / totalLeads) * 100).toFixed(1) : "0";
  const ticketMedio = leadsFechados > 0 ? receitaFechada / leadsFechados : 0;

  const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleExportCSV = () => {
    const headers = ["Nome", "Cidade", "WhatsApp", "Piscina", "Valor", "Status", "Loja", "Data"];
    const rows = filtered.map(l => [
      l.customer_name,
      l.customer_city,
      l.customer_whatsapp,
      l.pool_models?.name || "-",
      l.total_price.toString(),
      statusConfig[l.status].label,
      l.stores?.name || "-",
      l.created_at ? format(new Date(l.created_at), "dd/MM/yyyy HH:mm") : "-",
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestão de Leads</h1>
          <p className="text-sm text-muted-foreground">Controle completo de todos os leads capturados</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-1" /> Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-1" /> Exportar CSV
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
              <Users className="w-3.5 h-3.5" /> Total de Leads
            </div>
            <p className="text-2xl font-bold">{totalLeads}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {leadsNovos} novos • {leadsFechados} fechados • {leadsPerdidos} perdidos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
              <TrendingUp className="w-3.5 h-3.5" /> Taxa de Conversão
            </div>
            <p className="text-2xl font-bold text-emerald-600">{taxaConversao}%</p>
            <p className="text-xs text-muted-foreground mt-1">{leadsFechados} de {totalLeads} convertidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
              <DollarSign className="w-3.5 h-3.5" /> Receita Fechada
            </div>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(receitaFechada)}</p>
            <p className="text-xs text-muted-foreground mt-1">Ticket médio: {formatCurrency(ticketMedio)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
              <DollarSign className="w-3.5 h-3.5" /> Receita Potencial
            </div>
            <p className="text-2xl font-bold">{formatCurrency(receitaPotencial)}</p>
            <p className="text-xs text-muted-foreground mt-1">Soma de todos os leads</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Filter className="w-4 h-4" /> Filtros:
            </div>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar nome, cidade, telefone, piscina, loja..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            <Select value={filterStore} onValueChange={setFilterStore}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Loja" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as lojas</SelectItem>
                {stores.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {Object.entries(statusConfig).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterPeriod} onValueChange={setFilterPeriod}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo período</SelectItem>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="90d">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Leads ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>Nenhum lead encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Piscina</TableHead>
                  <TableHead>Loja</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">{lead.customer_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{lead.customer_city}</TableCell>
                    <TableCell className="text-sm">{lead.pool_models?.name || "-"}</TableCell>
                    <TableCell className="text-sm">{lead.stores?.name || "-"}</TableCell>
                    <TableCell className="text-sm font-medium">{formatCurrency(lead.total_price)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusConfig[lead.status].color}>
                        {statusConfig[lead.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {lead.created_at ? format(new Date(lead.created_at), "dd/MM/yy HH:mm", { locale: ptBR }) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewingLead(lead)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleWhatsApp(lead)}>
                          <Phone className="w-4 h-4 text-emerald-600" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeletingLead(lead)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Lead Dialog */}
      <Dialog open={!!viewingLead} onOpenChange={() => setViewingLead(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Lead</DialogTitle>
            <DialogDescription>Informações completas do lead capturado</DialogDescription>
          </DialogHeader>
          {viewingLead && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Nome</p>
                  <p className="font-medium">{viewingLead.customer_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">WhatsApp</p>
                  <p className="font-medium">{viewingLead.customer_whatsapp}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cidade</p>
                  <p className="font-medium flex items-center gap-1"><MapPin className="w-3 h-3" />{viewingLead.customer_city}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Piscina</p>
                  <p className="font-medium">{viewingLead.pool_models?.name || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor</p>
                  <p className="font-medium text-emerald-600">{formatCurrency(viewingLead.total_price)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Loja</p>
                  <p className="font-medium">{viewingLead.stores?.name || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Data</p>
                  <p className="font-medium flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {viewingLead.created_at ? format(new Date(viewingLead.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant="outline" className={statusConfig[viewingLead.status].color}>
                    {statusConfig[viewingLead.status].label}
                  </Badge>
                </div>
              </div>

              {viewingLead.selected_optionals && Array.isArray(viewingLead.selected_optionals) && viewingLead.selected_optionals.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Opcionais Selecionados</p>
                  <div className="flex flex-wrap gap-1">
                    {viewingLead.selected_optionals.map((opt: any, i: number) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {opt.name || opt} {opt.price ? `(${formatCurrency(opt.price)})` : ""}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs text-muted-foreground mb-2">Alterar Status</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(statusConfig).map(([key, cfg]) => (
                    <Button
                      key={key}
                      size="sm"
                      variant={viewingLead.status === key ? "default" : "outline"}
                      className="text-xs h-7"
                      disabled={updatingStatus === viewingLead.id}
                      onClick={() => handleUpdateStatus(viewingLead.id, key as ProposalStatus)}
                    >
                      {cfg.label}
                    </Button>
                  ))}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => handleWhatsApp(viewingLead)}>
                  <Phone className="w-4 h-4 mr-1 text-emerald-600" /> WhatsApp
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deletingLead} onOpenChange={() => setDeletingLead(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Lead</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o lead de <strong>{deletingLead?.customer_name}</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
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
