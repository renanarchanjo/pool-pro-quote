import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStoreData } from "@/hooks/useStoreData";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Check, X, Crown, CreditCard, ExternalLink, Users, FileText, TrendingUp, Radio, XCircle, Settings, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const PLANS = [
  {
    slug: "gratuito",
    name: "Gratuito",
    price: "R$ 0",
    priceId: null,
    productId: null,
    proposals: 10,
    features: [
      { text: "Até 10 orçamentos/mês", included: true },
      { text: "1 modelo de piscina", included: true },
      { text: "Marca d'água SIMULAPOOL", included: true },
      { text: "Personalização da marca", included: false },
      { text: "Equipe de colaboradores", included: false },
    ],
  },
  {
    slug: "premium",
    name: "Premium",
    price: "R$ 99,90",
    priceId: "price_1TEdIiDLDBZHKYif22uYH0ns",
    productId: "prod_UD3PEYnNACZIPf",
    proposals: 100,
    features: [
      { text: "Até 100 orçamentos/mês", included: true },
      { text: "Modelos ilimitados", included: true },
      { text: "Sem marca d'água", included: true },
      { text: "Personalização da marca", included: true },
      { text: "Até 3 colaboradores", included: true },
    ],
  },
  {
    slug: "avancado",
    name: "Avançado",
    price: "R$ 199,90",
    priceId: "price_1TEdJ4DLDBZHKYif5sFUfHLO",
    productId: "prod_UD3PdH9NRCfw5t",
    proposals: 500,
    popular: true,
    features: [
      { text: "Até 500 orçamentos/mês", included: true },
      { text: "Modelos ilimitados", included: true },
      { text: "Sem marca d'água", included: true },
      { text: "Personalização da marca", included: true },
      { text: "Até 7 colaboradores", included: true },
    ],
  },
  {
    slug: "escala",
    name: "Escala",
    price: "R$ 299,90",
    priceId: "price_1TEH5QD4inSHTJNL4PEeei2a",
    productId: "prod_UCgSX4JTil25jU",
    proposals: 1000,
    features: [
      { text: "Até 1.000 orçamentos/mês", included: true },
      { text: "Modelos ilimitados", included: true },
      { text: "Sem marca d'água", included: true },
      { text: "Personalização da marca", included: true },
      { text: "Até 10 colaboradores", included: true },
    ],
  },
];

const LEAD_PLAN = {
  priceId: "price_1TELsVD4inSHTJNLmue5gkTP",
  productId: "prod_UClPPxnoSh7tlx",
  price: "R$ 997,00",
};

interface ActiveProduct {
  product_id: string;
  price_id: string;
  subscription_end: string;
}

const SubscriptionManager = () => {
  const { store } = useStoreData();
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState<string | null>(null);
  const [leadPlanActive, setLeadPlanActive] = useState(false);
  const [activeProducts, setActiveProducts] = useState<ActiveProduct[]>([]);
  const [subscription, setSubscription] = useState<{
    subscribed: boolean;
    product_id: string | null;
    price_id: string | null;
    subscription_end: string | null;
  } | null>(null);

  useEffect(() => {
    checkSubscription();
  }, []);

  useEffect(() => {
    if (store) {
      supabase
        .from("stores")
        .select("lead_plan_active")
        .eq("id", store.id)
        .single()
        .then(({ data }) => {
          setLeadPlanActive(!!data?.lead_plan_active);
        });
    }
  }, [store]);

  const checkSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;
      setSubscription(data);
      setActiveProducts(data?.active_products || []);
    } catch (err) {
      console.error("Error checking subscription:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (priceId: string) => {
    try {
      setCheckoutLoading(priceId);
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast.error("Erro ao iniciar checkout: " + (err.message || "Tente novamente"));
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleCancelSubscription = async (productId: string, planName: string) => {
    try {
      setCancelLoading(productId);
      const { data, error } = await supabase.functions.invoke("cancel-subscription", {
        body: { product_id: productId, cancel_immediately: false },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Plano "${planName}" será cancelado ao final do período atual.`);
      // Refresh subscription status
      await checkSubscription();
    } catch (err: any) {
      toast.error("Erro ao cancelar: " + (err.message || "Tente novamente"));
    } finally {
      setCancelLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setPortalLoading(true);
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast.error("Erro ao abrir portal: " + (err.message || "Tente novamente"));
    } finally {
      setPortalLoading(false);
    }
  };

  const isProductActive = (productId: string | null) => {
    if (!productId) return false;
    return activeProducts.some(p => p.product_id === productId);
  };

  const isLeadPlanSubscribed = isProductActive(LEAD_PLAN.productId);

  const currentPlan = subscription?.subscribed
    ? PLANS.find((p) => p.productId === subscription.product_id)
    : PLANS[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold">Meu Plano</h1>
          <p className="text-muted-foreground text-sm">
            Plano atual:{" "}
            <span className="font-semibold text-primary">{currentPlan?.name || "Gratuito"}</span>
            {subscription?.subscription_end && (
              <span className="ml-2 text-xs sm:text-sm">
                · Renova em {new Date(subscription.subscription_end).toLocaleDateString("pt-BR")}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {subscription?.subscribed && (
            <Button variant="outline" size="sm" onClick={handleManageSubscription} disabled={portalLoading}>
              {portalLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Settings className="w-4 h-4 mr-2" />}
              <span className="hidden sm:inline">Gerenciar no</span> Portal Stripe
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={checkSubscription}>
            Atualizar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANS.map((plan, planIndex) => {
          const isCurrent =
            (!subscription?.subscribed && plan.slug === "gratuito") ||
            plan.productId === subscription?.product_id;

          const currentPlanIndex = subscription?.subscribed
            ? PLANS.findIndex((p) => p.productId === subscription.product_id)
            : 0;

          const isUpgrade = planIndex > currentPlanIndex;
          const isDowngrade = planIndex < currentPlanIndex;

          const getButtonLabel = () => {
            if (!subscription?.subscribed) return "Assinar";
            if (isUpgrade) return "Fazer Upgrade";
            if (isDowngrade) return "Downgrade";
            return "Assinar";
          };

          return (
            <Card
              key={plan.slug}
              className={`p-5 relative flex flex-col ${
                isCurrent ? "border-primary ring-2 ring-primary/20" : ""
              } ${plan.popular ? "border-primary/50" : ""}`}
            >
              {plan.popular && (
                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs">
                  Mais vendido
                </Badge>
              )}
              {isCurrent && (
                <Badge className="absolute -top-2.5 right-3 bg-green-500 text-white text-xs">
                  <Crown className="w-3 h-3 mr-1" /> Seu plano
                </Badge>
              )}

              <div className="mb-4">
                <h3 className="text-lg font-bold">{plan.name}</h3>
                <div className="mt-1">
                  <span className="text-2xl font-bold">{plan.price}</span>
                  {plan.priceId && <span className="text-sm text-muted-foreground">/mês</span>}
                </div>
              </div>

              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    {f.included ? (
                      <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    )}
                    <span className={f.included ? "" : "text-muted-foreground line-through"}>
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div className="space-y-2">
                  <Button disabled variant="outline" className="w-full">
                    Plano Atual
                  </Button>
                  {plan.priceId && plan.productId && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                          disabled={cancelLoading === plan.productId}
                        >
                          {cancelLoading === plan.productId ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 mr-1" />
                          )}
                          Cancelar Plano
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancelar plano {plan.name}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Seu plano continuará ativo até o final do período atual
                            {subscription?.subscription_end && (
                              <> ({new Date(subscription.subscription_end).toLocaleDateString("pt-BR")})</>
                            )}. Após isso, você será migrado para o plano Gratuito.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Manter Plano</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleCancelSubscription(plan.productId!, plan.name)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Confirmar Cancelamento
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              ) : plan.priceId ? (
                <Button
                  onClick={() => handleCheckout(plan.priceId!)}
                  disabled={!!checkoutLoading}
                  className={`w-full ${isDowngrade ? "bg-muted text-muted-foreground hover:bg-muted/80" : "gradient-primary text-white"}`}
                  variant={isDowngrade ? "outline" : "default"}
                >
                  {checkoutLoading === plan.priceId ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <ExternalLink className="w-4 h-4 mr-2" />
                  )}
                  {getButtonLabel()}
                </Button>
              ) : (
                <Button disabled variant="ghost" className="w-full text-muted-foreground">
                  Plano Gratuito
                </Button>
              )}
            </Card>
          );
        })}
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
                  <span className="text-2xl font-bold">R$ 14,90</span>
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
                  <span className="text-2xl font-bold">R$ 0,50</span>
                  <span className="text-sm text-muted-foreground"> /proposta gerada</span>
                </div>
                <Badge variant="outline" className="mt-2 text-xs">Conforme uso</Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Plano Gestão de Leads ── */}
      {leadPlanActive && (
        <>
          <Separator />
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Radio className="w-5 h-5 text-primary" />
              Gestão de Leads
            </h2>
            <Card className="p-6 border-primary/30 bg-primary/5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="font-bold text-lg">Plano de Captação de Leads</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Receba leads qualificados captados pelo simulador da plataforma, distribuídos diretamente para sua loja.
                  </p>
                  <ul className="mt-3 space-y-1.5 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500 shrink-0" />
                      <strong>100 leads por mês</strong> inclusos no plano
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500 shrink-0" />
                      Você escolhe quais leads aceitar ou recusar
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500 shrink-0" />
                      Dados completos do cliente (nome, cidade, WhatsApp)
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500 shrink-0" />
                      Modelo e orçamento já configurados
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500 shrink-0" />
                      Distribuição exclusiva por cidade
                    </li>
                    <li className="flex items-center gap-2 text-amber-600">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      R$ 25,00 por LEAD extra aprovado!
                    </li>
                  </ul>
                </div>
                <div className="text-center sm:text-right shrink-0">
                  <div className="mb-3">
                    <span className="text-3xl font-bold">{LEAD_PLAN.price}</span>
                    <span className="text-sm text-muted-foreground">/mês</span>
                  </div>
                  {isLeadPlanSubscribed ? (
                    <div className="space-y-2">
                      <Badge className="bg-emerald-500 text-white">
                        <Crown className="w-3 h-3 mr-1" /> Ativo
                      </Badge>
                      <div className="flex flex-col gap-2">
                        <Button variant="outline" size="sm" onClick={handleManageSubscription} disabled={portalLoading} className="w-full">
                          {portalLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CreditCard className="w-4 h-4 mr-1" />}
                          Gerenciar
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                              disabled={cancelLoading === LEAD_PLAN.productId}
                            >
                              {cancelLoading === LEAD_PLAN.productId ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 mr-1" />
                              )}
                              Cancelar Leads
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancelar Plano de Leads?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Seu plano de leads continuará ativo até o final do período atual. Após isso, você deixará de receber novos leads distribuídos pela plataforma.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Manter Plano</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleCancelSubscription(LEAD_PLAN.productId, "Gestão de Leads")}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Confirmar Cancelamento
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={() => handleCheckout(LEAD_PLAN.priceId)}
                      disabled={!!checkoutLoading}
                      className="gradient-primary text-white"
                    >
                      {checkoutLoading === LEAD_PLAN.priceId ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <ExternalLink className="w-4 h-4 mr-2" />
                      )}
                      Assinar Plano de Leads
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default SubscriptionManager;
