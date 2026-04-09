import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStoreData } from "@/hooks/useStoreData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Lock, CheckCircle, AlertTriangle, Copy, Package, XCircle, CheckCheck, Eye, FileDown, ExternalLink, Check, Radio, CreditCard, Users, UserPlus, Send, ZoomIn, ZoomOut, X, Search, RefreshCw, Download, Filter } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ProposalView from "@/components/simulator/ProposalView";

interface LeadPlanOption {
  id: string;
  name: string;
  price_monthly: number;
  lead_limit: number;
  excess_price: number;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
}

interface ReceivedLead {
  id: string;
  proposal_id: string;
  status: string;
  accepted_at: string | null;
  accepted_by: string | null;
  assigned_to: string | null;
  created_at: string;
  accepted_by_profile?: { full_name: string | null } | null;
  assigned_to_profile?: { full_name: string | null } | null;
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
  const { store, storeSettings, role, profile } = useStoreData();
  const [leads, setLeads] = useState<ReceivedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [storeInfo, setStoreInfo] = useState<{ lead_limit_monthly: number; lead_price_excess: number; lead_plan_active: boolean } | null>(null);
  const [viewingProposal, setViewingProposal] = useState<any>(null);
  const [loadingProposal, setLoadingProposal] = useState(false);
  const [previewZoomed, setPreviewZoomed] = useState(false);
  const [leadSubActive, setLeadSubActive] = useState<boolean | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [filterUser, setFilterUser] = useState<string>("all");
  const [teamMembers, setTeamMembers] = useState<{ id: string; full_name: string | null }[]>([]);
  const [leadPlans, setLeadPlans] = useState<LeadPlanOption[]>([]);
  const [selectedLeadPlan, setSelectedLeadPlan] = useState<LeadPlanOption | null>(null);
  // Search & filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [filterCity, setFilterCity] = useState("all");
  const [activeTab, setActiveTab] = useState("pendentes");
  // Assignment dialog
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assigningLeadId, setAssigningLeadId] = useState<string | null>(null);
  const [assignTargetUser, setAssignTargetUser] = useState<string>("");

  const isOwner = role === "owner";

  // Load available lead plans
  useEffect(() => {
    const loadLeadPlans = async () => {
      const { data } = await (supabase as any).from("lead_plans").select("*").eq("active", true).order("display_order");
      if (data) setLeadPlans(data);
    };
    loadLeadPlans();
  }, []);

  // Check if lead plan subscription is paid (or manually activated)
  useEffect(() => {
    if (storeInfo?.lead_plan_active) {
      setLeadSubActive(true);
      return;
    }
    if (storeInfo === null) return;
    const checkLeadSubscription = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("check-subscription");
        if (error) throw error;
        const activeProducts: { product_id: string }[] = data?.active_products || [];
        const productIds = leadPlans.map(p => p.stripe_product_id).filter(Boolean);
        const hasLeadPlan = activeProducts.some(p => productIds.includes(p.product_id));
        setLeadSubActive(hasLeadPlan);
      } catch {
        setLeadSubActive(false);
      }
    };
    checkLeadSubscription();
  }, [storeInfo, leadPlans]);

  const handleLeadCheckout = async (plan: LeadPlanOption) => {
    if (!plan.stripe_price_id) {
      toast.error("Plano sem configuração de pagamento");
      return;
    }
    try {
      setCheckoutLoading(true);
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId: plan.stripe_price_id },
      });
      if (error) throw error;
      if (data?.url) {
        toast.info("Redirecionando para o pagamento...");
        window.location.href = data.url;
        return;
      }
      throw new Error("URL de checkout não recebida");
    } catch (err: any) {
      toast.error("Erro ao iniciar checkout: " + (err.message || "Tente novamente"));
      setCheckoutLoading(false);
    }
  };

  const loadData = async () => {
    if (!store) return;
    setLoading(true);
    const [leadsRes, storeRes, teamRes] = await Promise.all([
      (supabase as any)
        .from("lead_distributions")
        .select("*, proposals(customer_name, customer_city, customer_whatsapp, total_price, created_at, pool_models(name)), accepted_by_profile:profiles!accepted_by(full_name), assigned_to_profile:profiles!assigned_to(full_name)")
        .eq("store_id", store.id)
        .order("created_at", { ascending: false })
        .limit(2000),
      (supabase as any)
        .from("stores")
        .select("lead_limit_monthly, lead_price_excess, lead_plan_active")
        .eq("id", store.id)
        .single(),
      supabase
        .from("profiles")
        .select("id, full_name")
        .eq("store_id", store.id),
    ]);
    if (leadsRes.data) setLeads(leadsRes.data);
    if (storeRes.data) setStoreInfo(storeRes.data);
    if (teamRes.data) setTeamMembers(teamRes.data);
    setLoading(false);
  };

  useEffect(() => {
    if (!store) return;
    loadData();
    const interval = setInterval(() => loadData(), 30000);
    return () => clearInterval(interval);
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

  const handleViewProposal = async (proposalId: string) => {
    setLoadingProposal(true);
    try {
      const { data: proposal, error } = await (supabase as any)
        .from("proposals")
        .select("*, pool_models(*, categories(name))")
        .eq("id", proposalId)
        .single();
      if (error) throw error;

      // Resolve optionals: if stored as plain UUIDs, fetch names/prices from DB
      if (Array.isArray(proposal.selected_optionals) && proposal.selected_optionals.length > 0) {
        const first = proposal.selected_optionals[0];
        const isUuidArray = typeof first === "string" && !first.includes("{");
        if (isUuidArray) {
          const ids = proposal.selected_optionals as string[];
          // Fetch from both optionals and model_optionals tables
          const [{ data: generalOpts }, { data: modelOpts }] = await Promise.all([
            supabase.from("optionals").select("id, name, price").in("id", ids),
            supabase.from("model_optionals").select("id, name, price").in("id", ids),
          ]);
          const allOpts = [...(generalOpts || []), ...(modelOpts || [])];
          proposal.selected_optionals = ids.map((id: string) => {
            const found = allOpts.find((o: any) => o.id === id);
            return found ? { id: found.id, name: found.name, price: found.price } : { id, name: id, price: 0 };
          });
        }
      }

      setViewingProposal(proposal);
    } catch (err: any) {
      toast.error("Erro ao carregar proposta: " + (err.message || ""));
    } finally {
      setLoadingProposal(false);
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

  const handleAssignLead = async () => {
    if (!assigningLeadId || !assignTargetUser) return;
    try {
      const { error } = await (supabase as any)
        .from("lead_distributions")
        .update({ assigned_to: assignTargetUser })
        .eq("id", assigningLeadId);
      if (error) throw error;
      toast.success("Lead atribuído com sucesso!");
      setAssignDialogOpen(false);
      setAssigningLeadId(null);
      setAssignTargetUser("");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao atribuir lead");
    }
  };

  const openAssignDialog = (leadId: string) => {
    setAssigningLeadId(leadId);
    setAssignTargetUser("");
    setAssignDialogOpen(true);
  };

  const getVisibleLeads = () => {
    if (isOwner) return leads.filter(l => l.proposals != null);
    return leads.filter(l => {
      if (!l.proposals) return false;
      if (l.status === "accepted" && l.accepted_by === profile?.id) return true;
      if (l.status === "pending" && (!l.assigned_to || l.assigned_to === profile?.id)) return true;
      return false;
    });
  };

  const allVisibleLeads = getVisibleLeads();

  // Apply search & filters
  const now = new Date();
  const filteredLeads = allVisibleLeads.filter(l => {
    const p = l.proposals;
    if (search) {
      const s = search.toLowerCase();
      if (![p.customer_name, p.customer_city, p.customer_whatsapp, p.pool_models?.name || ""].some(v => v.toLowerCase().includes(s))) return false;
    }
    if (filterStatus !== "all" && l.status !== filterStatus) return false;
    if (filterCity !== "all" && p.customer_city !== filterCity) return false;
    if (filterUser !== "all" && l.accepted_by !== filterUser) return false;
    if (filterPeriod !== "all") {
      const diffDays = (now.getTime() - new Date(l.created_at).getTime()) / 86400000;
      if (filterPeriod === "7d" && diffDays > 7) return false;
      if (filterPeriod === "30d" && diffDays > 30) return false;
      if (filterPeriod === "90d" && diffDays > 90) return false;
    }
    return true;
  });

  const pendingLeads = filteredLeads.filter(l => l.status === "pending");
  const acceptedLeads = filteredLeads.filter(l => l.status === "accepted");
  const rejectedLeads = filteredLeads.filter(l => l.status === "rejected");

  const tabLeads = filteredLeads.filter(l => {
    if (activeTab === "pendentes") return l.status === "pending";
    if (activeTab === "aceitos") return l.status === "accepted";
    if (activeTab === "recusados") return l.status === "rejected";
    return true;
  });

  const uniqueCities = [...new Set(allVisibleLeads.map(l => l.proposals.customer_city))].sort();

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const pendingInTab = tabLeads.filter(l => l.status === "pending");
    if (selectedIds.size === pendingInTab.length && pendingInTab.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingInTab.map(l => l.id)));
    }
  };

  const handleExportXlsx = async () => {
    const { exportLeadsXlsx } = await import("@/lib/exportLeadsXlsx");
    const rows = tabLeads.map(l => {
      const p = l.proposals;
      return {
        nome: l.status === "pending" ? maskName(p.customer_name) : p.customer_name,
        whatsapp: l.status === "accepted" ? p.customer_whatsapp : maskPhone(),
        cidade: p.customer_city,
        estado: "",
        piscina: p.pool_models?.name || "",
        valor: p.total_price,
        status: statusLabel(l.status),
        distribuidoPara: l.assigned_to_profile?.full_name || "",
        dataEntrada: l.created_at || "",
        dataDistribuicao: l.accepted_at || "",
      };
    });
    await exportLeadsXlsx(rows);
    toast.success("Planilha exportada com sucesso");
  };

  // Monthly stats
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const consumed = leads.filter(l => l.status === "accepted" && l.accepted_at && new Date(l.accepted_at) >= monthStart).length;
  const limit = storeInfo?.lead_limit_monthly || 100;
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

  if (loading || leadSubActive === null) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (!storeInfo?.lead_plan_active) {
    return (
      <div className="text-center py-20">
        <Lock className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h2 className="text-xl font-bold mb-2">Plano de Leads não ativo</h2>
        <p className="text-muted-foreground">Entre em contato com a administração para ativar o recebimento de leads.</p>
      </div>
    );
  }

  if (!leadSubActive) {
    const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    return (
      <div className="space-y-6 max-w-4xl mx-auto py-10">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Radio className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2">Ative seu Plano de Leads</h2>
          <p className="text-muted-foreground text-sm">
            Sua loja foi habilitada para receber leads qualificados! Escolha o plano ideal para o seu negócio.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {leadPlans.map(plan => (
            <Card
              key={plan.id}
              className={`relative cursor-pointer transition-all ${selectedLeadPlan?.id === plan.id ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"}`}
              onClick={() => setSelectedLeadPlan(plan)}
            >
              {selectedLeadPlan?.id === plan.id && (
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-primary-foreground" />
                </div>
              )}
              <CardContent className="p-5">
                <h3 className="font-bold text-sm mb-3">{plan.name}</h3>
                <p className="text-2xl font-bold">{formatCurrency(plan.price_monthly)}</p>
                <p className="text-xs text-muted-foreground mb-4">/mês</p>
                <ul className="space-y-2 text-xs">
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <strong>{plan.lead_limit} leads</strong>/mês inclusos
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    Escolha quais leads aceitar
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    Dados completos do cliente
                  </li>
                  <li className="flex items-center gap-1.5 text-amber-600">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {formatCurrency(plan.excess_price)} por lead extra
                  </li>
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {selectedLeadPlan && (
          <div className="flex justify-center">
            <Button
              onClick={() => handleLeadCheckout(selectedLeadPlan)}
              disabled={checkoutLoading}
              className="gradient-primary text-white"
              size="lg"
            >
              {checkoutLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <CreditCard className="w-4 h-4 mr-2" />
              )}
              Assinar {selectedLeadPlan.name} — {formatCurrency(selectedLeadPlan.price_monthly)}/mês
            </Button>
          </div>
        )}

        <p className="text-xs text-center text-muted-foreground">
          Após a confirmação do pagamento, seus leads serão liberados automaticamente.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <h1 className="text-xl md:text-2xl font-bold">
        {isOwner ? "Gestão de Leads" : "Meus Leads"}
      </h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2 md:gap-4">
        <Card>
          <CardContent className="pt-3 pb-2 md:pt-4 md:pb-3 px-3 md:px-6">
            <p className="text-[11px] md:text-xs text-muted-foreground mb-0.5">Leads Recebidos</p>
            <p className="text-xl md:text-2xl font-bold">{allVisibleLeads.length}</p>
            <p className="text-[10px] md:text-xs text-muted-foreground">{pendingLeads.length} pendentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-2 md:pt-4 md:pb-3 px-3 md:px-6">
            <p className="text-[11px] md:text-xs text-muted-foreground mb-0.5">Aceitos este mês</p>
            <p className="text-xl md:text-2xl font-bold">{consumed} <span className="text-xs md:text-sm text-muted-foreground font-normal">/ {limit}</span></p>
          </CardContent>
        </Card>
        {isOwner && (
          <>
            <Card className={excess > 0 ? "border-amber-500/50" : ""}>
              <CardContent className="pt-3 pb-2 md:pt-4 md:pb-3 px-3 md:px-6">
                <p className="text-[11px] md:text-xs text-muted-foreground mb-0.5">Excedentes</p>
                <p className={`text-xl md:text-2xl font-bold ${excess > 0 ? "text-amber-600" : ""}`}>{excess}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3 pb-2 md:pt-4 md:pb-3 px-3 md:px-6">
                <p className="text-[11px] md:text-xs text-muted-foreground mb-0.5">Custo Adicional</p>
                <p className={`text-xl md:text-2xl font-bold ${excess > 0 ? "text-red-600" : ""}`}>{formatCurrency(excess * excessPrice)}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {isOwner && excess > 0 && (
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-700 rounded-lg p-3 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          Você atingiu seu limite mensal de {limit} leads. Leads adicionais serão cobrados a {formatCurrency(excessPrice)} por lead na fatura mensal.
        </div>
      )}

      {/* Info for sellers */}
      {!isOwner && (
        <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 text-primary rounded-lg p-3 text-sm">
          <Users className="w-4 h-4 flex-shrink-0" />
          Você visualiza apenas os leads atribuídos a você ou que você aceitou.
        </div>
      )}

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 bg-primary/5 border border-primary/20 rounded-lg p-3 animate-fade-in">
          <span className="text-sm font-medium">{selectedIds.size} lead(s) selecionado(s)</span>
          <div className="flex gap-2 sm:ml-auto w-full sm:w-auto">
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
        <CardHeader className="pb-2 px-3 md:px-6 flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-sm md:text-base">Leads Recebidos ({validLeads.length})</CardTitle>
          {isOwner && teamMembers.length > 1 && (
            <Select value={filterUser} onValueChange={setFilterUser}>
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <Users className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Filtrar por usuário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos da equipe</SelectItem>
                {teamMembers.map(m => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.full_name || "Sem nome"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {validLeads.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>{isOwner ? "Nenhum lead recebido ainda" : "Nenhum lead atribuído a você"}</p>
              <p className="text-xs mt-1">{isOwner ? "Leads serão distribuídos pela administração" : "Aguarde o admin atribuir leads para você"}</p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="block md:hidden divide-y divide-border">
                {validLeads.map(lead => {
                  const p = lead.proposals;
                  const isPending = lead.status === "pending";
                  return (
                    <div key={lead.id} className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0 flex-1">
                          {isPending && (
                            <Checkbox
                              checked={selectedIds.has(lead.id)}
                              onCheckedChange={() => toggleSelect(lead.id)}
                              className="mt-0.5"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sm truncate">
                              {isPending ? maskName(p.customer_name) : p.customer_name}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {p.pool_models?.name || "-"} · {p.customer_city}
                            </p>
                            {lead.assigned_to_profile?.full_name && (
                              <p className="text-[10px] text-primary mt-0.5">
                                → {lead.assigned_to_profile.full_name}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-sm text-primary">{formatCurrency(p.total_price)}</p>
                          <Badge variant="outline" className={`text-[10px] mt-0.5 ${statusClass(lead.status)}`}>
                            {statusLabel(lead.status)}
                          </Badge>
                          {lead.status === "accepted" && lead.accepted_by_profile?.full_name && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Aceito por {lead.accepted_by_profile.full_name}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-muted-foreground">
                          {format(new Date(lead.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                        </span>

                        {isPending ? (
                          <div className="flex gap-2">
                            {isOwner && teamMembers.length > 1 && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-9 text-xs"
                                onClick={() => openAssignDialog(lead.id)}
                              >
                                <Send className="w-3.5 h-3.5 mr-1" /> Atribuir
                              </Button>
                            )}
                            <Button
                              size="sm"
                              className="h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-4"
                              onClick={() => handleAccept(lead.id)}
                              disabled={accepting === lead.id || bulkProcessing}
                            >
                              {accepting === lead.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><CheckCircle className="w-3.5 h-3.5 mr-1" /> Aceitar</>}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-9 text-xs border-red-500/30 text-red-600 px-3"
                              onClick={() => handleReject(lead.id)}
                              disabled={bulkProcessing}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ) : lead.status === "accepted" ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-9 text-xs"
                              onClick={() => { navigator.clipboard.writeText(p.customer_whatsapp); toast.success("Número copiado!"); }}
                            >
                              <Copy className="w-3.5 h-3.5 mr-1" /> Copiar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-9 text-xs"
                              onClick={() => handleViewProposal(lead.proposal_id)}
                              disabled={loadingProposal}
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" /> Ver
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block">
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
                      {isOwner && <TableHead>Atribuído a</TableHead>}
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
                            {lead.status === "accepted" && lead.accepted_by_profile?.full_name && (
                              <p className="text-[10px] text-muted-foreground mt-1">
                                Aceito por {lead.accepted_by_profile.full_name}
                              </p>
                            )}
                          </TableCell>
                          {isOwner && (
                            <TableCell>
                              {lead.assigned_to_profile?.full_name ? (
                                <Badge variant="secondary" className="text-[10px]">
                                  {lead.assigned_to_profile.full_name}
                                </Badge>
                              ) : isPending ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-[11px] text-muted-foreground hover:text-primary"
                                  onClick={() => openAssignDialog(lead.id)}
                                >
                                  <Send className="w-3 h-3 mr-1" /> Atribuir
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          )}
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
                            ) : lead.status === "accepted" ? (
                              <div className="flex items-center justify-end gap-1">
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleViewProposal(lead.proposal_id)} disabled={loadingProposal}>
                                  {loadingProposal ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Eye className="w-3 h-3 mr-1" /> Ver Proposta</>}
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
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

      {/* Proposal Preview Overlay */}
      {viewingProposal && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 md:p-6"
          onClick={() => { setViewingProposal(null); setPreviewZoomed(false); }}
        >
          <div
            className="relative bg-background rounded-2xl shadow-2xl border border-border flex flex-col w-full max-w-lg max-h-[85dvh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0">
              <span className="text-sm font-bold text-foreground">Proposta</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPreviewZoomed(!previewZoomed)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
                  title={previewZoomed ? "Reduzir" : "Ampliar"}
                >
                  {previewZoomed ? <ZoomOut className="w-4 h-4 text-muted-foreground" /> : <ZoomIn className="w-4 h-4 text-muted-foreground" />}
                </button>
                <button
                  onClick={() => { setViewingProposal(null); setPreviewZoomed(false); }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Proposal content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
              <div
                style={{
                  transform: previewZoomed ? 'scale(1)' : 'scale(0.65)',
                  transformOrigin: 'top center',
                  width: previewZoomed ? '100%' : '154%',
                  marginLeft: previewZoomed ? '0' : '-27%',
                  minHeight: previewZoomed ? 'auto' : '154%',
                  transition: 'transform 250ms ease, width 250ms ease, margin 250ms ease',
                }}
              >
                <ProposalView
                  model={{
                    name: viewingProposal.pool_models?.name || "Modelo",
                    length: viewingProposal.pool_models?.length,
                    width: viewingProposal.pool_models?.width,
                    depth: viewingProposal.pool_models?.depth,
                    differentials: viewingProposal.pool_models?.differentials || [],
                    included_items: viewingProposal.pool_models?.included_items || [],
                    not_included_items: viewingProposal.pool_models?.not_included_items || [],
                    base_price: viewingProposal.pool_models?.base_price || 0,
                    delivery_days: viewingProposal.pool_models?.delivery_days || 30,
                    installation_days: viewingProposal.pool_models?.installation_days || 5,
                    payment_terms: viewingProposal.pool_models?.payment_terms,
                  }}
                  selectedOptionals={
                    Array.isArray(viewingProposal.selected_optionals)
                      ? viewingProposal.selected_optionals.map((o: any) => ({ name: o.name || o, price: o.price || 0 }))
                      : []
                  }
                  customerData={{
                    name: viewingProposal.customer_name,
                    city: viewingProposal.customer_city,
                    whatsapp: viewingProposal.customer_whatsapp,
                  }}
                  category={viewingProposal.pool_models?.categories?.name || ""}
                  onBack={() => { setViewingProposal(null); setPreviewZoomed(false); }}
                  storeSettings={storeSettings}
                  storeName={store?.name}
                  storeCity={store?.city}
                  storeState={store?.state}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Lead Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Atribuir Lead</DialogTitle>
            <DialogDescription>
              Escolha o membro da equipe que receberá este lead. Apenas ele poderá aceitá-lo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {teamMembers.filter(m => m.id !== profile?.id).map(m => (
              <button
                key={m.id}
                onClick={() => setAssignTargetUser(m.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  assignTargetUser === m.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">
                    {(m.full_name || "?")[0].toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-medium">{m.full_name || "Sem nome"}</span>
                {assignTargetUser === m.id && (
                  <Check className="w-4 h-4 text-primary ml-auto" />
                )}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleAssignLead}
              disabled={!assignTargetUser}
              className="gradient-primary text-white"
            >
              <Send className="w-4 h-4 mr-2" />
              Atribuir Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminLeads;
