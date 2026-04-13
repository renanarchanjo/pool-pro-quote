import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, FileText, CreditCard, TrendingUp, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

interface Payment {
  id: string;
  amount: number;
  status: string;
  payment_date: string | null;
  period_start: string | null;
  period_end: string | null;
  stores: { name: string } | null;
  subscription_plans: { name: string } | null;
}

const PLANS = [
  { name: "Gratuito", price: "R$ 0", proposals: 10, users: 1, slug: "gratuito" },
  { name: "Premium", price: "R$ 99,90", proposals: 100, users: 3, slug: "premium" },
  { name: "Avançado", price: "R$ 199,90", proposals: 500, users: 7, slug: "avancado", popular: true },
  { name: "Escala", price: "R$ 299,90", proposals: 1000, users: 10, slug: "escala" },
];

const ADDITIONAL_COSTS = {
  perUser: 14.90,
  perProposal: 0.50,
};

const MatrizPayments = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      const { data, error } = await supabase
        .from("payment_history")
        .select("id, store_id, amount, status, payment_date, plan_id, stripe_invoice_id, stores(name), subscription_plans(name)")
        .order("payment_date", { ascending: false });
      if (error) console.error("Error loading payments:", error);
      setPayments((data as any) || []);
    } catch (e) {
      console.error("Error loading payments:", e);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("pt-BR") : "-";

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const statusBadge = (status: string) => {
    const map: Record<string, { className: string; label: string }> = {
      paid: { className: "bg-green-500/10 text-green-600 border-green-500/20", label: "Pago" },
      pending: { className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20", label: "Pendente" },
      failed: { className: "bg-red-500/10 text-red-600 border-red-500/20", label: "Falhou" },
      refunded: { className: "bg-gray-500/10 text-gray-600 border-gray-500/20", label: "Estornado" },
    };
    const s = map[status] || { className: "bg-gray-500/10 text-gray-600", label: status };
    return <Badge className={s.className}>{s.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-8">
        <Skeleton className="h-8 w-64 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[180px] rounded-xl" />)}
        </div>
        <Skeleton className="h-[300px] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-[18px] font-semibold text-foreground">Cobranças e Pagamentos</h1>
        <p className="text-[13px] text-muted-foreground">Visão geral dos planos, custos adicionais e histórico de pagamentos</p>
      </div>

      {/* Planos Recorrentes */}
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <CreditCard className="w-5 h-5 text-primary" />
          Planos Recorrentes (Cartão de Crédito)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map((plan) => (
            <Card
              key={plan.slug}
              className={`p-4 relative ${plan.popular ? "border-primary/50 ring-1 ring-primary/20" : ""}`}
            >
              {plan.popular && (
                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs">
                  Mais vendido
                </Badge>
              )}
              <h3 className="font-bold text-base">{plan.name}</h3>
              <div className="mt-1 mb-3">
                <span className="text-xl font-bold">{plan.price}</span>
                {plan.slug !== "gratuito" && <span className="text-sm text-muted-foreground">/mês</span>}
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Até {plan.proposals.toLocaleString("pt-BR")} orçamentos/mês</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>Até {plan.users} usuário{plan.users > 1 ? "s" : ""}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Separator />

      {/* Plano de Distribuição de Leads */}
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <MapPin className="w-5 h-5 text-primary" />
          Plano de Distribuição de Leads
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-5 border-primary/30 bg-primary/5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Gestão de Leads</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Recebimento e gestão de leads distribuídos pela Matriz, com limite mensal configurável
                </p>
                <div className="mt-2">
                  <span className="text-2xl font-bold">R$ 997,00</span>
                  <span className="text-sm text-muted-foreground"> /mês</span>
                </div>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">Recorrente</Badge>
                  <Badge variant="outline" className="text-xs">Ativação manual pela Matriz</Badge>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5 border-orange-500/30 bg-orange-500/5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <TrendingUp className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Leads Excedentes</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Cobrado por cada lead aceito além do limite mensal do plano de leads
                </p>
                <div className="mt-2">
                  <span className="text-2xl font-bold">R$ 25,00</span>
                  <span className="text-sm text-muted-foreground"> /lead excedente</span>
                </div>
                <Badge variant="outline" className="mt-2 text-xs">Conforme uso</Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Separator />

      {/* Custos Adicionais */}
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary" />
          Custos Adicionais (Cobranças Extras)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-5 border-amber-500/30 bg-amber-500/5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Users className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Usuário Adicional</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Cobrado quando a loja ultrapassa o limite de usuários do plano
                </p>
                <div className="mt-2">
                  <span className="text-2xl font-bold">{formatCurrency(ADDITIONAL_COSTS.perUser)}</span>
                  <span className="text-sm text-muted-foreground"> /usuário/mês</span>
                </div>
                <Badge variant="outline" className="mt-2 text-xs">Recorrente</Badge>
              </div>
            </div>
          </Card>

          <Card className="p-5 border-blue-500/30 bg-blue-500/5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Propostas Extras</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Cobrado por proposta gerada além do limite mensal do plano
                </p>
                <div className="mt-2">
                  <span className="text-2xl font-bold">{formatCurrency(ADDITIONAL_COSTS.perProposal)}</span>
                  <span className="text-sm text-muted-foreground"> /proposta gerada</span>
                </div>
                <Badge variant="outline" className="mt-2 text-xs">Conforme uso</Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Separator />

      {/* Histórico de Pagamentos */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          Histórico de Pagamentos ({payments.length})
        </h2>

        {payments.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Nenhum pagamento registrado ainda.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Os pagamentos aparecerão aqui quando os lojistas começarem a assinar os planos.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {payments.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{p.stores?.name || "Loja removida"}</span>
                      {statusBadge(p.status)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {p.subscription_plans?.name || "-"} · {formatDate(p.payment_date)}
                      {p.period_start && p.period_end && (
                        <span> · Período: {formatDate(p.period_start)} - {formatDate(p.period_end)}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-lg font-bold">{formatCurrency(p.amount)}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MatrizPayments;
