import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Save, Settings, CreditCard, Users, FileText, Pencil, MapPin } from "lucide-react";
import { toast } from "sonner";

interface Plan {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
  max_proposals_per_month: number;
  max_users: number;
  active: boolean;
  display_order: number;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
}

interface PlatformSetting {
  id: string;
  key: string;
  value: string;
  label: string | null;
}

const MatrizPlans = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [settings, setSettings] = useState<PlatformSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [editForm, setEditForm] = useState({ name: "", price_monthly: "", max_proposals_per_month: "", max_users: "", active: true });
  const [settingsForm, setSettingsForm] = useState<Record<string, string>>({});

  const loadData = async () => {
    setLoading(true);
    const [plansRes, settingsRes] = await Promise.all([
      (supabase as any).from("subscription_plans").select("*").order("display_order"),
      (supabase as any).from("platform_settings").select("*"),
    ]);
    if (plansRes.data) setPlans(plansRes.data);
    if (settingsRes.data) {
      setSettings(settingsRes.data);
      const form: Record<string, string> = {};
      settingsRes.data.forEach((s: PlatformSetting) => { form[s.key] = s.value; });
      setSettingsForm(form);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const openEditPlan = (plan: Plan) => {
    setEditingPlan(plan);
    setEditForm({
      name: plan.name,
      price_monthly: plan.price_monthly.toString(),
      max_proposals_per_month: plan.max_proposals_per_month.toString(),
      max_users: plan.max_users?.toString() || "1",
      active: plan.active ?? true,
    });
  };

  const handleSavePlan = async () => {
    if (!editingPlan) return;
    setSaving(true);

    const newPrice = parseFloat(editForm.price_monthly) || 0;
    const priceChanged = newPrice !== editingPlan.price_monthly;
    const nameChanged = editForm.name !== editingPlan.name;

    try {
      // If price or name changed and plan is paid, sync with Stripe
      if ((priceChanged || nameChanged) && newPrice > 0) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sessão expirada");

        const { data, error: fnError } = await supabase.functions.invoke("sync-stripe-price", {
          body: {
            plan_id: editingPlan.id,
            new_price_monthly: newPrice,
            plan_name: editForm.name,
          },
        });

        if (fnError) throw new Error(fnError.message || "Erro ao sincronizar com Stripe");
        if (data?.error) throw new Error(data.error);

        // Also update non-price fields
        const { error: updateError } = await supabase.from("subscription_plans").update({
          max_proposals_per_month: parseInt(editForm.max_proposals_per_month) || 0,
          max_users: parseInt(editForm.max_users) || 1,
          active: editForm.active,
        } as any).eq("id", editingPlan.id);

        if (updateError) throw updateError;

        const migrated = data?.migrated_subscriptions || 0;
        toast.success(
          migrated > 0
            ? `Plano atualizado e ${migrated} assinatura(s) migrada(s) no Stripe!`
            : "Plano atualizado e sincronizado com o Stripe!"
        );
      } else {
        // No price change, just update DB
        const { error } = await supabase.from("subscription_plans").update({
          name: editForm.name,
          price_monthly: newPrice,
          max_proposals_per_month: parseInt(editForm.max_proposals_per_month) || 0,
          max_users: parseInt(editForm.max_users) || 1,
          active: editForm.active,
        } as any).eq("id", editingPlan.id);

        if (error) throw error;
        toast.success("Plano atualizado!");
      }

      setEditingPlan(null);
      loadData();
    } catch (error: any) {
      console.error("Error saving plan:", error);
      toast.error(error.message || "Erro ao salvar plano");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    let hasError = false;
    for (const setting of settings) {
      if (settingsForm[setting.key] !== setting.value) {
        const { error } = await (supabase as any)
          .from("platform_settings")
          .update({ value: settingsForm[setting.key], updated_at: new Date().toISOString() })
          .eq("id", setting.id);
        if (error) hasError = true;
      }
    }
    if (hasError) toast.error("Erro ao salvar configurações");
    else { toast.success("Configurações salvas!"); loadData(); }
    setSaving(false);
  };

  const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gestão de Planos</h1>
        <p className="text-sm text-muted-foreground">Gerencie planos, preços, limites e custos adicionais</p>
      </div>

      {/* Plans Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><CreditCard className="w-4 h-4" /> Planos de Assinatura</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plano</TableHead>
                <TableHead>Preço Mensal</TableHead>
                <TableHead>Limite Orçamentos</TableHead>
                <TableHead>Limite Usuários</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map(plan => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">{plan.name}</TableCell>
                  <TableCell>{formatCurrency(plan.price_monthly)}</TableCell>
                  <TableCell>{plan.max_proposals_per_month}</TableCell>
                  <TableCell>{plan.max_users || 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${plan.active ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"}`}>
                        {plan.active ? "Ativo" : "Inativo"}
                      </span>
                      {plan.stripe_price_id ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">
                          Stripe ✓
                        </span>
                      ) : plan.price_monthly > 0 ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-600">
                          Sem Stripe
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEditPlan(plan)}>
                      <Pencil className="w-4 h-4 mr-1" /> Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Lead Distribution Plan */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><MapPin className="w-4 h-4" /> Plano de Distribuição de Leads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Valor Mensal</p>
              <p className="text-2xl font-bold mt-1">R$ 997,00</p>
              <p className="text-xs text-muted-foreground mt-1">Cobrado via Stripe</p>
            </div>
            <div className="p-4 rounded-lg border border-border/50 bg-muted/30">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Limite Padrão</p>
              <p className="text-2xl font-bold mt-1">100 leads/mês</p>
              <p className="text-xs text-muted-foreground mt-1">Configurável por loja</p>
            </div>
            <div className="p-4 rounded-lg border border-orange-500/30 bg-orange-500/5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Custo Excedente</p>
              <p className="text-2xl font-bold mt-1">R$ 25,00</p>
              <p className="text-xs text-muted-foreground mt-1">Por lead além do limite</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            💡 O plano de leads é ativado manualmente pela Matriz em cada loja. Os limites e valores de excedente podem ser ajustados individualmente na gestão de lojas.
          </p>
        </CardContent>
      </Card>

      {/* Extra Costs Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Settings className="w-4 h-4" /> Custos Adicionais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {settings.map(setting => (
              <div key={setting.id} className="space-y-2">
                <Label htmlFor={setting.key} className="text-sm font-medium">
                  {setting.key === "extra_user_cost" && <Users className="w-3.5 h-3.5 inline mr-1.5" />}
                  {setting.key === "extra_proposal_cost" && <FileText className="w-3.5 h-3.5 inline mr-1.5" />}
                  {setting.label || setting.key}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id={setting.key}
                    type="number"
                    step="0.01"
                    value={settingsForm[setting.key] || ""}
                    onChange={e => setSettingsForm(prev => ({ ...prev, [setting.key]: e.target.value }))}
                    className="max-w-[200px]"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {setting.key === "extra_user_cost" && "Cobrado por cada usuário além do limite do plano"}
                  {setting.key === "extra_proposal_cost" && "Cobrado por cada orçamento além do limite do plano"}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <Button onClick={handleSaveSettings} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
              Salvar Configurações
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Edit Plan Dialog */}
      <Dialog open={!!editingPlan} onOpenChange={() => setEditingPlan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Plano: {editingPlan?.name}</DialogTitle>
            <DialogDescription>Altere os valores e limites do plano</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Plano</Label>
              <Input value={editForm.name} onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Preço Mensal (R$)</Label>
                <Input type="number" step="0.01" value={editForm.price_monthly} onChange={e => setEditForm(prev => ({ ...prev, price_monthly: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Limite de Orçamentos/mês</Label>
                <Input type="number" value={editForm.max_proposals_per_month} onChange={e => setEditForm(prev => ({ ...prev, max_proposals_per_month: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Limite de Usuários</Label>
                <Input type="number" value={editForm.max_users} onChange={e => setEditForm(prev => ({ ...prev, max_users: e.target.value }))} />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch checked={editForm.active} onCheckedChange={v => setEditForm(prev => ({ ...prev, active: v }))} />
                <Label>Plano ativo</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPlan(null)}>Cancelar</Button>
            <Button onClick={handleSavePlan} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MatrizPlans;
