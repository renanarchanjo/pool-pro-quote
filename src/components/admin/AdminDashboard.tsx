import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, FileText, TrendingUp, Users, Search, Download, Phone, Eye, Link2, Mail, Pencil } from "lucide-react";
import { useStoreData } from "@/hooks/useStoreData";
import { toast } from "sonner";
import html2pdf from "html2pdf.js";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import ProposalView from "@/components/simulator/ProposalView";

type ProposalStatus = "nova" | "enviada" | "em_negociacao" | "fechada" | "perdida";

interface Proposal {
  id: string;
  customer_name: string;
  customer_city: string;
  customer_whatsapp: string;
  total_price: number;
  created_at: string;
  selected_optionals: any;
  store_id: string | null;
  status: ProposalStatus;
  pool_models: { name: string; length: number | null; width: number | null; depth: number | null; photo_url: string | null; differentials: string[]; included_items: string[]; not_included_items: string[]; base_price: number; delivery_days: number; installation_days: number; payment_terms: string | null; notes: string | null; category_id: string } | null;
  stores: { name: string } | null;
}

const statusConfig: Record<ProposalStatus, { label: string; className: string }> = {
  nova: { label: "Nova", className: "bg-blue-100 text-blue-700 border-blue-200" },
  enviada: { label: "Enviada", className: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  em_negociacao: { label: "Em Negociação", className: "bg-amber-100 text-amber-700 border-amber-200" },
  fechada: { label: "Fechada", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  perdida: { label: "Perdida", className: "bg-red-100 text-red-700 border-red-200" },
};

const AdminDashboard = () => {
  const { profile, store, storeSettings } = useStoreData();
  const [stats, setStats] = useState({ total: 0, thisMonth: 0, thisWeek: 0, totalRevenue: 0 });
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [filtered, setFiltered] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewingProposal, setViewingProposal] = useState<Proposal | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let result = proposals;
    if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.customer_name.toLowerCase().includes(q) ||
          p.customer_city.toLowerCase().includes(q) ||
          p.customer_whatsapp.includes(q) ||
          p.pool_models?.name?.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [search, proposals, statusFilter]);

  const loadData = async () => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())).toISOString();

      const [totalRes, monthRes, weekRes, allRes] = await Promise.all([
        supabase.from("proposals").select("total_price", { count: "exact" }),
        supabase.from("proposals").select("*", { count: "exact", head: true }).gte("created_at", startOfMonth),
        supabase.from("proposals").select("*", { count: "exact", head: true }).gte("created_at", startOfWeek),
        supabase.from("proposals").select(`
          id, customer_name, customer_city, customer_whatsapp,
          total_price, created_at, selected_optionals, store_id, status,
          pool_models (name, length, width, depth, photo_url, differentials, included_items, not_included_items, base_price, delivery_days, installation_days, payment_terms, notes, category_id),
          stores (name)
        `).order("created_at", { ascending: false }),
      ]);

      const totalRevenue = (totalRes.data || []).reduce((sum, p) => sum + (p.total_price || 0), 0);

      setStats({
        total: totalRes.count || 0,
        thisMonth: monthRes.count || 0,
        thisWeek: weekRes.count || 0,
        totalRevenue,
      });
      setProposals((allRes.data as any) || []);
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (v: number) =>
    `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const updateStatus = async (id: string, newStatus: ProposalStatus) => {
    try {
      const { error } = await supabase.from("proposals").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
      setProposals((prev) => prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p)));
      toast.success("Status atualizado");
    } catch {
      toast.error("Erro ao atualizar status");
    }
  };

  const handleWhatsApp = (p: Proposal) => {
    const msg = encodeURIComponent(
      `Olá ${p.customer_name}! Segue sua proposta:\n\nModelo: ${p.pool_models?.name || "N/A"}\nValor: ${formatCurrency(p.total_price)}\n\nEntre em contato para mais detalhes!`
    );
    const phone = p.customer_whatsapp.replace(/\D/g, "");
    window.open(`https://wa.me/55${phone}?text=${msg}`, "_blank");
  };

  const handleCopyLink = (p: Proposal) => {
    const link = `${window.location.origin}/proposta/${p.id}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    toast.info("Gerando PDF...");
    try {
      await html2pdf()
        .set({
          margin: 10,
          filename: `relatorio-propostas-${new Date().toISOString().split("T")[0]}.pdf`,
          html2canvas: { scale: 2 },
          jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
        })
        .from(reportRef.current)
        .save();
      toast.success("PDF exportado com sucesso!");
    } catch {
      toast.error("Erro ao gerar PDF");
    }
  };

  const handleExportSinglePDF = (p: Proposal) => {
    setViewingProposal(p);
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-muted-foreground mb-1">
            Olá, <span className="font-bold text-foreground">{profile?.full_name || "Lojista"}</span>
          </p>
          <h1 className="text-3xl font-bold">Dashboard</h1>
        </div>
        <Button onClick={handleExportPDF} variant="outline" className="shrink-0">
          <Download className="w-4 h-4 mr-2" />
          Exportar Relatório
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Propostas</p>
                <p className="text-3xl font-bold mt-1">{stats.total}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Este Mês</p>
                <p className="text-3xl font-bold mt-1">{stats.thisMonth}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Receita Total</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalRevenue)}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ticket Médio</p>
                <p className="text-2xl font-bold mt-1">
                  {stats.total > 0 ? formatCurrency(stats.totalRevenue / stats.total) : "R$ 0,00"}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nome, cidade, WhatsApp ou modelo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            {Object.entries(statusConfig).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Proposals Table */}
      <div ref={reportRef}>
        <Card className="border-border/50 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">
              Propostas {filtered.length !== proposals.length && `(${filtered.length} de ${proposals.length})`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {search || statusFilter !== "all" ? "Nenhuma proposta encontrada" : "Nenhuma proposta gerada ainda"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>CLIENTE</TableHead>
                      <TableHead>MODELO</TableHead>
                      <TableHead>TOTAL</TableHead>
                      <TableHead>STATUS</TableHead>
                      <TableHead>DATA</TableHead>
                      <TableHead>AÇÕES</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((p) => {
                      const sc = statusConfig[p.status] || statusConfig.nova;
                      return (
                        <TableRow key={p.id}>
                          <TableCell>
                            <div>
                              <p className="font-semibold">{p.customer_name}</p>
                              <p className="text-xs text-muted-foreground">{p.customer_city}</p>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {p.pool_models?.name || "N/A"}
                          </TableCell>
                          <TableCell className="font-bold text-primary whitespace-nowrap">
                            {formatCurrency(p.total_price)}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={p.status}
                              onValueChange={(v) => updateStatus(p.id, v as ProposalStatus)}
                            >
                              <SelectTrigger className={`w-[150px] h-8 text-xs font-medium border ${sc.className}`}>
                                <div className="flex items-center gap-1.5">
                                  <Pencil className="w-3 h-3" />
                                  <SelectValue />
                                </div>
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(statusConfig).map(([key, { label }]) => (
                                  <SelectItem key={key} value={key}>{label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            {new Date(p.created_at).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1.5">
                              <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                                onClick={() => setViewingProposal(p)}>
                                <Eye className="w-3 h-3" /> Ver
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                                onClick={() => handleCopyLink(p)}>
                                <Link2 className="w-3 h-3" /> Link
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                                onClick={() => handleExportSinglePDF(p)}>
                                <Download className="w-3 h-3 text-red-500" /> PDF
                              </Button>
                              <Button size="sm" className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => handleWhatsApp(p)}>
                                <Phone className="w-3 h-3" /> WhatsApp
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Proposal Detail Dialog */}
      <Dialog open={!!viewingProposal} onOpenChange={(open) => !open && setViewingProposal(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Proposta — {viewingProposal?.customer_name}</DialogTitle>
          </DialogHeader>
          {viewingProposal?.pool_models && (
            <ProposalView
              model={viewingProposal.pool_models as any}
              selectedOptionals={[]}
              customerData={{
                name: viewingProposal.customer_name,
                city: viewingProposal.customer_city,
                whatsapp: viewingProposal.customer_whatsapp,
              }}
              category={viewingProposal.pool_models.name}
              onBack={() => setViewingProposal(null)}
              storeSettings={storeSettings}
              storeName={store?.name}
              storeCity={store?.city}
              storeState={store?.state}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
