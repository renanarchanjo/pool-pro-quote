import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStoreData } from "@/hooks/useStoreData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Lock, CheckCircle, AlertTriangle, Copy, Package, XCircle, CheckCheck, Eye, FileDown } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ProposalView from "@/components/simulator/ProposalView";

interface ReceivedLead {
  id: string;
  proposal_id: string;
  status: string;
  accepted_at: string | null;
  created_at: string;
  proposals: {
    customer_name: string;
    customer_city: string;
    customer_whatsapp: string;
    total_price: number;
    created_at: string;
    pool_models: { name: string } | null;
  };
}

const AdminLeads = () => {
  const { store } = useStoreData();
  const [leads, setLeads] = useState<ReceivedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [storeInfo, setStoreInfo] = useState<{ lead_limit_monthly: number; lead_price_excess: number; lead_plan_active: boolean } | null>(null);
  const [viewingProposal, setViewingProposal] = useState<any>(null);
  const [loadingProposal, setLoadingProposal] = useState(false);

  const loadData = async () => {
    if (!store) return;
    setLoading(true);
    const [leadsRes, storeRes] = await Promise.all([
      (supabase as any)
        .from("lead_distributions")
        .select("*, proposals(customer_name, customer_city, customer_whatsapp, total_price, created_at, pool_models(name))")
        .eq("store_id", store.id)
        .order("created_at", { ascending: false }),
      (supabase as any)
        .from("stores")
        .select("lead_limit_monthly, lead_price_excess, lead_plan_active")
        .eq("id", store.id)
        .single(),
    ]);
    if (leadsRes.data) setLeads(leadsRes.data);
    if (storeRes.data) setStoreInfo(storeRes.data);
    setLoading(false);
  };

  useEffect(() => {
    if (!store) return;
    loadData();
    const channel = supabase
      .channel("store-leads-" + store.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "lead_distributions" }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [store]);

  const handleAccept = async (distId: string) => {
    setAccepting(distId);
    try {
      const { data, error } = await supabase.functions.invoke("accept-lead", {
        body: { distribution_id: distId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const msg = data.is_excess
        ? `Lead aceito! ⚠️ Excedente (${data.consumed}/${data.limit}) — custo adicional de ${Number(data.excess_price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`
        : `Lead aceito! ${data.consumed}/${data.limit} utilizados este mês`;
      toast.success(msg);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao aceitar lead");
    }
    setAccepting(null);
  };

  const handleReject = async (distId: string) => {
    try {
      const { error } = await supabase
        .from("lead_distributions")
        .update({ status: "rejected" })
        .eq("id", distId);
      if (error) throw error;
      toast.success("Lead recusado");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao recusar lead");
    }
  };

  const handleBulkAccept = async () => {
    if (selectedIds.size === 0) return;
    setBulkProcessing(true);
    let success = 0;
    let failed = 0;
    for (const id of selectedIds) {
      try {
        const { data, error } = await supabase.functions.invoke("accept-lead", {
          body: { distribution_id: id },
        });
        if (error || data?.error) { failed++; continue; }
        success++;
      } catch { failed++; }
    }
    toast.success(`${success} lead(s) aceito(s)${failed > 0 ? `, ${failed} com erro` : ""}`);
    setSelectedIds(new Set());
    setBulkProcessing(false);
    loadData();
  };

  const handleBulkReject = async () => {
    if (selectedIds.size === 0) return;
    setBulkProcessing(true);
    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase
        .from("lead_distributions")
        .update({ status: "rejected" })
        .in("id", ids);
      if (error) throw error;
      toast.success(`${ids.length} lead(s) recusado(s)`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao recusar leads");
    }
    setSelectedIds(new Set());
    setBulkProcessing(false);
    loadData();
  };

  const pendingLeads = leads.filter(l => l.status === "pending" && l.proposals != null);
  const validLeads = leads.filter(l => l.proposals != null);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === pendingLeads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingLeads.map(l => l.id)));
    }
  };

  // Monthly stats
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const consumed = leads.filter(l => l.status === "accepted" && l.accepted_at && new Date(l.accepted_at) >= monthStart).length;
  const limit = storeInfo?.lead_limit_monthly || 40;
  const excess = Math.max(0, consumed - limit);
  const excessPrice = storeInfo?.lead_price_excess || 25;

  const maskName = (name: string) => name.length > 3 ? name.slice(0, 3) + "•••" : "•••";
  const maskPhone = () => "(••) •••••-••••";
  const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const statusLabel = (s: string) => {
    if (s === "pending") return "Pendente";
    if (s === "accepted") return "Aceito";
    if (s === "rejected") return "Recusado";
    return s;
  };

  const statusClass = (s: string) => {
    if (s === "pending") return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    if (s === "accepted") return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    if (s === "rejected") return "bg-red-500/10 text-red-600 border-red-500/20";
    return "";
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (!storeInfo?.lead_plan_active) {
    return (
      <div className="text-center py-20">
        <Lock className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h2 className="text-xl font-bold mb-2">Plano de Leads não ativo</h2>
        <p className="text-muted-foreground">Entre em contato com a administração para ativar o recebimento de leads.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Meus Leads</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1">Leads Recebidos</p>
            <p className="text-2xl font-bold">{leads.length}</p>
            <p className="text-xs text-muted-foreground">{pendingLeads.length} pendentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1">Aceitos este mês</p>
            <p className="text-2xl font-bold">{consumed} <span className="text-sm text-muted-foreground font-normal">/ {limit}</span></p>
          </CardContent>
        </Card>
        <Card className={excess > 0 ? "border-amber-500/50" : ""}>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1">Excedentes</p>
            <p className={`text-2xl font-bold ${excess > 0 ? "text-amber-600" : ""}`}>{excess}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1">Custo Adicional Previsto</p>
            <p className={`text-2xl font-bold ${excess > 0 ? "text-red-600" : ""}`}>{formatCurrency(excess * excessPrice)}</p>
          </CardContent>
        </Card>
      </div>

      {excess > 0 && (
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-700 rounded-lg p-3 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          Você atingiu seu limite mensal de {limit} leads. Leads adicionais serão cobrados a {formatCurrency(excessPrice)} por lead na fatura mensal.
        </div>
      )}

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg p-3 animate-fade-in">
          <span className="text-sm font-medium">{selectedIds.size} lead(s) selecionado(s)</span>
          <div className="flex gap-2 ml-auto">
            <Button
              size="sm"
              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleBulkAccept}
              disabled={bulkProcessing}
            >
              {bulkProcessing ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCheck className="w-3.5 h-3.5 mr-1" />}
              Aceitar Selecionados
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs border-red-500/30 text-red-600 hover:bg-red-50"
              onClick={handleBulkReject}
              disabled={bulkProcessing}
            >
              <XCircle className="w-3.5 h-3.5 mr-1" />
              Recusar Selecionados
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Leads Recebidos ({validLeads.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {validLeads.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>Nenhum lead recebido ainda</p>
              <p className="text-xs mt-1">Leads serão distribuídos pela administração</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {pendingLeads.length > 0 && (
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selectedIds.size === pendingLeads.length && pendingLeads.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                  )}
                  <TableHead>Cliente</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Piscina</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Recebido em</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {validLeads.map(lead => {
                  const p = lead.proposals;
                  const isPending = lead.status === "pending";
                  return (
                    <TableRow key={lead.id} className={selectedIds.has(lead.id) ? "bg-primary/5" : ""}>
                      {pendingLeads.length > 0 && (
                        <TableCell>
                          {isPending ? (
                            <Checkbox
                              checked={selectedIds.has(lead.id)}
                              onCheckedChange={() => toggleSelect(lead.id)}
                            />
                          ) : <span className="w-4" />}
                        </TableCell>
                      )}
                      <TableCell className="font-medium">{isPending ? maskName(p.customer_name) : p.customer_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.customer_city}</TableCell>
                      <TableCell className="text-sm">{p.pool_models?.name || "-"}</TableCell>
                      <TableCell className="text-sm font-medium">{formatCurrency(p.total_price)}</TableCell>
                      <TableCell className="text-sm">
                        {isPending ? (
                          <span className="flex items-center gap-1 text-muted-foreground"><Lock className="w-3 h-3" />{maskPhone()}</span>
                        ) : lead.status === "rejected" ? (
                          <span className="text-muted-foreground text-xs">—</span>
                        ) : (
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { navigator.clipboard.writeText(p.customer_whatsapp); toast.success("Número copiado!"); }}>
                            <Copy className="w-3 h-3 mr-1" />{p.customer_whatsapp}
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{format(new Date(lead.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusClass(lead.status)}>
                          {statusLabel(lead.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleAccept(lead.id)} disabled={accepting === lead.id || bulkProcessing}>
                              {accepting === lead.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><CheckCircle className="w-3 h-3 mr-1" /> Aceitar</>}
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleReject(lead.id)} disabled={bulkProcessing}>
                              <XCircle className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">{lead.accepted_at ? format(new Date(lead.accepted_at), "dd/MM HH:mm") : ""}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLeads;
