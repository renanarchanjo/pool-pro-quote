import { useState, useEffect } from "react";
import { TableSkeleton } from "./AdminLoadingSkeleton";
import { supabase } from "@/integrations/supabase/client";
import { useStoreData } from "@/hooks/useStoreData";
import { toast } from "sonner";
import { Loader2, Plus, Minus, Trash2, UserPlus, Shield, Eye, EyeOff, Pencil, AlertTriangle, Users, CreditCard, ExternalLink, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TeamPerformance from "./TeamPerformance";
import TeamCommissions from "./TeamCommissions";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Plan-based user limits
const PLAN_USER_LIMITS: Record<string, number> = {
  gratuito: 1,
  premium: 3,
  avancado: 7,
  escala: 10,
};

interface TeamMember {
  id: string;
  full_name: string | null;
  role: string;
  daily_lead_limit: number;
  commission_percent: number;
}

const TeamManager = () => {
  const { store, role, profile } = useStoreData();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showExtraDialog, setShowExtraDialog] = useState(false);
  const [extraQuantity, setExtraQuantity] = useState(1);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [editingCommission, setEditingCommission] = useState<string | null>(null);
  const [editCommissionPercent, setEditCommissionPercent] = useState("");
  const [savingCommission, setSavingCommission] = useState(false);
  const [commissionSettings, setCommissionSettings] = useState<any[]>([]);
  const [currentPlanSlug, setCurrentPlanSlug] = useState<string>("gratuito");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "seller",
  });

  // LIM PISCINAS has unlimited members
  const LIM_PISCINAS_STORE_ID = "5e8165c0-64b6-4d06-b274-8eeb261a79c4";
  const isUnlimited = store?.id === LIM_PISCINAS_STORE_ID;
  const maxMembers = isUnlimited ? Infinity : (PLAN_USER_LIMITS[currentPlanSlug] || 1);

  useEffect(() => {
    if (store) {
      loadMembers();
      loadSubscription();
    }
  }, [store]);

  const loadSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) return;
      if (data?.subscribed && data?.product_id) {
        // Map product IDs to plan slugs
        const productPlanMap: Record<string, string> = {
          "prod_UCgRljPq5bvjS4": "premium",
          "prod_UCgScAiO19M68R": "avancado",
          "prod_UCgSX4JTil25jU": "escala",
        };
        setCurrentPlanSlug(productPlanMap[data.product_id] || "gratuito");
      }
    } catch {
      // fallback to gratuito
    }
  };

  const loadMembers = async () => {
    if (!store) return;
    try {
      const [profilesRes, commRes] = await Promise.all([
        (supabase as any)
        .from("profiles")
        .select("id, full_name, daily_lead_limit")
        .eq("store_id", store.id),
        (supabase as any)
          .from("commission_settings")
          .select("*")
          .eq("store_id", store.id),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      const commSettings = commRes.data || [];
      setCommissionSettings(commSettings);

      const membersList: TeamMember[] = [];
      for (const p of profilesRes.data || []) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", p.id)
          .single();

        const cs = commSettings.find((c: any) => c.member_id === p.id);
        membersList.push({
          id: p.id,
          full_name: p.full_name,
          role: roleData?.role || "seller",
          daily_lead_limit: p.daily_lead_limit || 0,
          commission_percent: cs ? cs.commission_percent : 0,
        });
      }

      setMembers(membersList);
    } catch (error) {
      console.error("Error loading members:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.full_name) {
      toast.error("Preencha todos os campos");
      return;
    }
    if (formData.password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    // UX hint only — the backend enforces the real limit
    if (!isUnlimited && members.length >= maxMembers) {
      toast.error(`Limite de ${maxMembers} usuários no plano atual atingido. Faça upgrade para adicionar mais membros.`);
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const response = await supabase.functions.invoke("invite-team-member", {
        body: {
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          role: formData.role,
          enforce_plan_limit: true,
        },
      });

      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);

      toast.success("Membro adicionado com sucesso!");
      setFormData({ email: "", password: "", full_name: "", role: "seller" });
      setShowForm(false);
      loadMembers();
    } catch (error: any) {
      console.error("Error inviting:", error);
      toast.error(error.message || "Erro ao convidar membro");
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangeRole = async (memberId: string, newRole: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await supabase.functions.invoke("invite-team-member", {
        body: {
          action: "update_role",
          target_user_id: memberId,
          role: newRole,
        },
      });

      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);

      toast.success("Permissão atualizada");
      setEditingRole(null);
      loadMembers();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar permissão");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      if (memberId === session.user.id) {
        toast.error("Você não pode remover sua própria conta");
        return;
      }

      const { error } = await supabase.rpc("remove_team_member", {
        _member_id: memberId,
      });

      if (error) throw error;

      toast.success("Membro removido da equipe");
      loadMembers();
    } catch (error: any) {
      console.error("Error removing member:", error);
      toast.error(error.message || "Erro ao remover membro");
    }
  };

  const handleSaveCommission = async (memberId: string) => {
    if (!store) return;
    setSavingCommission(true);
    try {
      const percent = parseFloat(editCommissionPercent) || 0;
      const existing = commissionSettings.find((s: any) => s.member_id === memberId);
      if (existing) {
        const { error } = await (supabase as any).from("commission_settings")
          .update({ commission_percent: percent, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("commission_settings")
          .insert({ store_id: store.id, member_id: memberId, commission_percent: percent });
        if (error) throw error;
      }
      toast.success("Comissão atualizada");
      setEditingCommission(null);
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, commission_percent: percent } : m));
      await loadMembers();
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao salvar comissão");
    } finally {
      setSavingCommission(false);
    }
  };

  const getRoleBadge = (memberRole: string) => {
    if (memberRole === "owner") {
      return <Badge className="bg-primary/10 text-primary border-primary/20">Admin</Badge>;
    }
    return <Badge variant="secondary">Colaborador</Badge>;
  };

  if (loading) {
    return <TableSkeleton rows={3} cols={3} />;
  }

  if (role !== "owner") {
    return (
      <div className="text-center p-8">
        <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-lg font-medium">Acesso restrito</p>
        <p className="text-muted-foreground">Apenas administradores podem gerenciar a equipe.</p>
      </div>
    );
  }

  const handleExtraMemberCheckout = async () => {
    try {
      setCheckoutLoading(true);
      const { data, error } = await supabase.functions.invoke("create-member-checkout", {
        body: { quantity: extraQuantity },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) {
        toast.info("Redirecionando para o pagamento...");
        window.location.href = data.url;
        return;
      }
      throw new Error("URL de checkout não recebida");
    } catch (err: any) {
      toast.error(err.message || "Erro ao iniciar checkout");
      setCheckoutLoading(false);
    }
  };

  const isAtLimit = !isUnlimited && members.length >= maxMembers;

  return (
    <div className="space-y-6 max-w-4xl">
      <Tabs defaultValue="membros" className="w-full">
        <TabsList>
          <TabsTrigger value="membros">Membros</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="comissao">Comissão</TabsTrigger>
        </TabsList>

        <TabsContent value="membros" className="space-y-6 mt-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Equipe</h2>
          <p className="text-muted-foreground text-sm">Gerencie os membros da sua loja</p>
        </div>
        {!isAtLimit ? (
          <Button
            onClick={() => setShowForm(!showForm)}
            className="gradient-primary text-white"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Novo Membro
          </Button>
        ) : (
          <Button
            onClick={() => setShowExtraDialog(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Contratar Colaborador Extra
          </Button>
        )}
      </div>

      {/* Limit warning */}
      {isAtLimit ? (
        <Alert className="border-amber-500/50 bg-amber-500/5">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="flex flex-col gap-2">
            <span className="font-medium text-amber-700 text-sm">
              LIMITE ATINGIDO: {maxMembers} COLABORADOR{maxMembers > 1 ? "ES" : ""}
            </span>
            <span className="text-sm text-muted-foreground">
              Para adicionar mais membros, contrate colaboradores extras por <strong>R$ 14,90/mês</strong> cada.
            </span>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-muted bg-muted/30">
          <Users className="h-4 w-4 text-muted-foreground" />
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">
              {members.length}/{maxMembers} colaboradores utilizados
            </span>
          </AlertDescription>
        </Alert>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Adicionar Membro</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Nome Completo *</Label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Nome do colaborador"
                  />
                </div>
                <div>
                  <Label>Permissão</Label>
                  <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">Admin (acesso total)</SelectItem>
                      <SelectItem value="seller">Colaborador (dashboard + propostas)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>E-mail *</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div>
                  <Label>Senha Inicial *</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Mínimo 6 caracteres"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="gradient-primary text-white" disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  {submitting ? "Criando..." : "Adicionar"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {members.map((member) => {
          const isCurrentUser = member.id === profile?.id;
          const isSeller = member.role === "seller";
          return (
            <Card key={member.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">
                      {(member.full_name || "?")[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{member.full_name || "Sem nome"}</p>
                      {isCurrentUser && (
                        <Badge variant="outline" className="text-xs">Você</Badge>
                      )}
                    </div>
                    {editingRole === member.id ? (
                      <div className="flex items-center gap-2 mt-1">
                        <Select
                          defaultValue={member.role}
                          onValueChange={(v) => handleChangeRole(member.id, v)}
                        >
                          <SelectTrigger className="h-7 text-xs w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="owner">Admin</SelectItem>
                            <SelectItem value="seller">Colaborador</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingRole(null)}>
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      getRoleBadge(member.role)
                    )}
                  </div>
                </div>
                {!isCurrentUser && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingRole(editingRole === member.id ? null : member.id)}
                      title="Editar permissão"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" title="Remover membro">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover membro?</AlertDialogTitle>
                          <AlertDialogDescription>
                            "{member.full_name}" perderá acesso à loja. Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRemoveMember(member.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
              {/* Daily lead limit */}
              {(
                <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between gap-3">
                  <div className="text-sm text-muted-foreground">
                    Limite diário de leads:
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={String(member.daily_lead_limit)}
                      onValueChange={async (v) => {
                        const newLimit = parseInt(v);
                        try {
                          const { error } = await (supabase as any)
                            .from("profiles")
                            .update({ daily_lead_limit: newLimit })
                            .eq("id", member.id);
                          if (error) throw error;
                          setMembers(prev => prev.map(m => m.id === member.id ? { ...m, daily_lead_limit: newLimit } : m));
                          toast.success(`Limite atualizado para ${newLimit === 0 ? "ilimitado" : newLimit + " leads/dia"}`);
                        } catch (err: any) {
                          toast.error(err.message || "Erro ao atualizar limite");
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 w-[140px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Ilimitado</SelectItem>
                        <SelectItem value="1">1 lead/dia</SelectItem>
                        <SelectItem value="2">2 leads/dia</SelectItem>
                        <SelectItem value="3">3 leads/dia</SelectItem>
                        <SelectItem value="5">5 leads/dia</SelectItem>
                        <SelectItem value="10">10 leads/dia</SelectItem>
                        <SelectItem value="15">15 leads/dia</SelectItem>
                        <SelectItem value="20">20 leads/dia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              {/* Commission percent */}
              {(
                <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between gap-3">
                  <div className="text-sm text-muted-foreground">
                    Comissão de venda:
                  </div>
                  <div className="flex items-center gap-2">
                    {editingCommission === member.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          step="0.5"
                          min="0"
                          max="100"
                          value={editCommissionPercent}
                          onChange={e => setEditCommissionPercent(e.target.value)}
                          className="h-8 w-20 text-xs px-2"
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleSaveCommission(member.id)} disabled={savingCommission}>
                          <Save className="w-4 h-4 text-emerald-600" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingCommission(null)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium">{member.commission_percent}%</span>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditingCommission(member.id); setEditCommissionPercent(String(member.commission_percent)); }}>
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Dialog para escolher quantidade de colaboradores extras */}
      <Dialog open={showExtraDialog} onOpenChange={(open) => { setShowExtraDialog(open); if (!open) setExtraQuantity(1); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Contratar Colaboradores Extras</DialogTitle>
            <DialogDescription>
              Escolha quantos colaboradores extras deseja adicionar à sua equipe. Cada colaborador custa <strong>R$ 14,90/mês</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setExtraQuantity(Math.max(1, extraQuantity - 1))}
                disabled={extraQuantity <= 1}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="text-4xl font-bold w-16 text-center">{extraQuantity}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setExtraQuantity(Math.min(20, extraQuantity + 1))}
                disabled={extraQuantity >= 20}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {extraQuantity} colaborador{extraQuantity > 1 ? "es" : ""} × R$ 14,90 = <strong>R$ {(extraQuantity * 14.9).toFixed(2).replace(".", ",")}/mês</strong>
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExtraDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleExtraMemberCheckout}
              disabled={checkoutLoading}
              className="gradient-primary text-white"
            >
              {checkoutLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ExternalLink className="w-4 h-4 mr-2" />
              )}
              Ir para Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </TabsContent>

        <TabsContent value="performance" className="mt-4">
          <TeamPerformance />
        </TabsContent>

        <TabsContent value="comissao" className="mt-4">
          <TeamCommissions />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TeamManager;
