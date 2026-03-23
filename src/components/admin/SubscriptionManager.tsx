import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, X, Crown, CreditCard, ExternalLink } from "lucide-react";
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
      { text: "Equipe de vendedores", included: false },
    ],
  },
  {
    slug: "premium",
    name: "Premium",
    price: "R$ 99,90",
    priceId: "price_1TEH4XD4inSHTJNLF37wMK1P",
    productId: "prod_UCgRljPq5bvjS4",
    proposals: 100,
    features: [
      { text: "Até 100 orçamentos/mês", included: true },
      { text: "Modelos ilimitados", included: true },
      { text: "Sem marca d'água", included: true },
      { text: "Personalização da marca", included: true },
      { text: "Até 3 vendedores", included: true },
    ],
  },
  {
    slug: "avancado",
    name: "Avançado",
    price: "R$ 199,90",
    priceId: "price_1TEH59D4inSHTJNL3Pv8cwj5",
    productId: "prod_UCgScAiO19M68R",
    proposals: 500,
    popular: true,
    features: [
      { text: "Até 500 orçamentos/mês", included: true },
      { text: "Modelos ilimitados", included: true },
      { text: "Sem marca d'água", included: true },
      { text: "Personalização da marca", included: true },
      { text: "Até 7 vendedores", included: true },
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
      { text: "Até 10 vendedores", included: true },
    ],
  },
];

const SubscriptionManager = () => {
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [subscription, setSubscription] = useState<{
    subscribed: boolean;
    product_id: string | null;
    price_id: string | null;
    subscription_end: string | null;
  } | null>(null);

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;
      setSubscription(data);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Meu Plano</h1>
          <p className="text-muted-foreground">
            Plano atual:{" "}
            <span className="font-semibold text-primary">{currentPlan?.name || "Gratuito"}</span>
            {subscription?.subscription_end && (
              <span className="ml-2 text-sm">
                · Renova em {new Date(subscription.subscription_end).toLocaleDateString("pt-BR")}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {subscription?.subscribed && (
            <Button variant="outline" onClick={handleManageSubscription} disabled={portalLoading}>
              {portalLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CreditCard className="w-4 h-4 mr-2" />}
              Gerenciar Assinatura
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={checkSubscription}>
            Atualizar Status
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANS.map((plan) => {
          const isCurrent =
            (!subscription?.subscribed && plan.slug === "gratuito") ||
            plan.productId === subscription?.product_id;

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
                <Button disabled variant="outline" className="w-full">
                  Plano Atual
                </Button>
              ) : plan.priceId ? (
                <Button
                  onClick={() => handleCheckout(plan.priceId!)}
                  disabled={!!checkoutLoading}
                  className={`w-full ${plan.popular ? "gradient-primary text-white" : ""}`}
                  variant={plan.popular ? "default" : "outline"}
                >
                  {checkoutLoading === plan.priceId ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <ExternalLink className="w-4 h-4 mr-2" />
                  )}
                  Assinar
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
    </div>
  );
};

export default SubscriptionManager;
