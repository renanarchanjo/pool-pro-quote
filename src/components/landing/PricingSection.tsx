import { useEffect, useState } from "react";
import { Check, X, Zap, Users, BarChart3, Shield, Rocket, Crown, Star, ArrowRight, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface SubPlan {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
  max_proposals_per_month: number;
  max_users: number;
  display_order: number;
}

interface LeadPlan {
  id: string;
  name: string;
  price_monthly: number;
  lead_limit: number;
  excess_price: number;
  display_order: number;
}

const planIcons: Record<string, React.ReactNode> = {
  gratuito: <Zap className="w-6 h-6" />,
  premium: <Star className="w-6 h-6" />,
  avancado: <Rocket className="w-6 h-6" />,
  escala: <Crown className="w-6 h-6" />,
};

const planDescriptions: Record<string, string> = {
  gratuito: "Conheça a plataforma sem compromisso.",
  premium: "Para quem já vende e quer agilizar.",
  avancado: "Para lojas com alto volume de vendas.",
  escala: "Para redes e operações de grande porte.",
};

const planFeatures: Record<string, { text: string; included: boolean; bold?: boolean }[]> = {
  gratuito: [
    { text: "Até 10 orçamentos/mês", included: true },
    { text: "1 modelo de piscina", included: true },
    { text: "Marca d'água SIMULAPOOL", included: true },
    { text: "Personalização da marca", included: false },
    { text: "Equipe de colaboradores", included: false },
  ],
  premium: [
    { text: "Até 100 orçamentos/mês", included: true },
    { text: "Modelos ilimitados", included: true },
    { text: "Sem marca d'água", included: true },
    { text: "Personalização da marca", included: true },
    { text: "Até 3 colaboradores", included: true },
  ],
  avancado: [
    { text: "Até 500 orçamentos/mês", included: true },
    { text: "Modelos ilimitados", included: true },
    { text: "Sem marca d'água", included: true },
    { text: "Personalização da marca", included: true },
    { text: "Até 7 colaboradores", included: true },
  ],
  escala: [
    { text: "Até 1.000 orçamentos/mês", included: true },
    { text: "Modelos ilimitados", included: true },
    { text: "Sem marca d'água", included: true },
    { text: "Personalização da marca", included: true },
    { text: "Até 10 colaboradores", included: true },
  ],
};

const highlightedSlug = "avancado";

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PricingSection = () => {
  const [plans, setPlans] = useState<SubPlan[]>([]);
  const [leadPlans, setLeadPlans] = useState<LeadPlan[]>([]);
  const [extraProposalCost, setExtraProposalCost] = useState("0,50");
  const [extraUserCost, setExtraUserCost] = useState("14,90");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [plansRes, leadRes, settingsRes] = await Promise.all([
        supabase.rpc("get_subscription_plans_public"),
        supabase.rpc("get_lead_plans_public"),
        supabase.from("platform_settings").select("key, value"),
      ]);
      if (plansRes.data) setPlans(plansRes.data as SubPlan[]);
      if (leadRes.data) setLeadPlans(leadRes.data as LeadPlan[]);
      if (settingsRes.data) {
        const map = Object.fromEntries(settingsRes.data.map((s: any) => [s.key, s.value]));
        if (map.extra_proposal_cost) setExtraProposalCost(formatCurrency(Number(map.extra_proposal_cost)));
        if (map.extra_user_cost) setExtraUserCost(formatCurrency(Number(map.extra_user_cost)));
      }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="py-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <section className="py-12 md:py-20">
      {/* Hero Pricing Header */}
      <div className="text-center mb-16">
        <Badge variant="secondary" className="mb-4 bg-primary/10 text-primary border-primary/20 px-4 py-1.5 text-sm font-semibold">
          💰 Planos & Preços
        </Badge>
        <h1 className="text-3xl md:text-5xl font-display font-extrabold mb-4 leading-tight">
          Invista no crescimento{" "}
          <span className="bg-gradient-to-r from-primary to-cyan-500 bg-clip-text text-transparent">
            da sua loja
          </span>
        </h1>
        <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto">
          Comece grátis, escale conforme sua operação cresce.
          <br className="hidden md:block" />
          Sem fidelidade. Cancele quando quiser.
        </p>
      </div>

      {/* Subscription Plans */}
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${Math.min(plans.length, 4)} gap-5 max-w-6xl mx-auto mb-8`}>
        {plans.map((plan) => {
          const isHighlighted = plan.slug === highlightedSlug;
          const icon = planIcons[plan.slug] || <Star className="w-6 h-6" />;
          const features = planFeatures[plan.slug] || [];
          const description = planDescriptions[plan.slug] || "";
          const usersLabel = plan.max_users >= 999 ? "Usuários ilimitados" : `${plan.max_users} usuário${plan.max_users > 1 ? "s" : ""}`;
          const proposalsLabel = plan.max_proposals_per_month >= 9999
            ? "Orçamentos ilimitados"
            : `${plan.max_proposals_per_month.toLocaleString("pt-BR")} orçamentos/mês`;

          return (
            <div key={plan.id} className="relative flex flex-col group">
              {isHighlighted && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                  <span className="gradient-primary text-white text-xs font-bold px-5 py-1.5 rounded-full shadow-lg whitespace-nowrap">
                    🔥 Mais vendido
                  </span>
                </div>
              )}
              <Card
                className={`flex-1 flex flex-col p-0 overflow-hidden transition-all duration-300 ${
                  isHighlighted
                    ? "border-primary shadow-pool ring-2 ring-primary/20 scale-[1.03]"
                    : "border-border/50 hover:shadow-card hover:border-primary/30"
                }`}
              >
                {/* Plan Header */}
                <div className={`px-6 pt-6 pb-4 ${isHighlighted ? "bg-primary/5" : ""}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isHighlighted
                        ? "gradient-primary text-white"
                        : "bg-primary/10 text-primary"
                    }`}>
                      {icon}
                    </div>
                    <h3 className="text-xl font-display font-bold">{plan.name}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>

                {/* Price */}
                <div className="px-6 py-4 border-y border-border/30">
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm text-muted-foreground">R$</span>
                    <span className={`text-4xl font-display font-extrabold ${
                      isHighlighted ? "text-primary" : "text-foreground"
                    }`}>
                      {formatCurrency(plan.price_monthly)}
                    </span>
                    <span className="text-muted-foreground text-sm">/mês</span>
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="px-6 py-3 flex flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium bg-primary/5 text-primary rounded-full px-3 py-1.5">
                    <Users className="w-3.5 h-3.5" />
                    {usersLabel}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-medium bg-primary/5 text-primary rounded-full px-3 py-1.5">
                    <BarChart3 className="w-3.5 h-3.5" />
                    {proposalsLabel}
                  </div>
                </div>

                {/* Features */}
                <div className="px-6 py-4 flex-1">
                  <ul className="space-y-2.5">
                    {features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-sm">
                        {feature.included ? (
                          <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check className="w-3 h-3 text-emerald-600" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                            <X className="w-3 h-3 text-muted-foreground/40" />
                          </div>
                        )}
                        <span
                          className={
                            feature.included
                              ? feature.bold
                                ? "font-semibold text-foreground"
                                : "text-foreground/80"
                              : "text-muted-foreground/50 line-through"
                          }
                        >
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA */}
                <div className="px-6 pb-6 pt-2">
                  <Link to="/auth">
                    <Button
                      className={`w-full font-display font-semibold text-base h-12 ${
                        isHighlighted
                          ? "gradient-primary text-white shadow-pool hover:shadow-lg transition-shadow"
                          : ""
                      }`}
                      variant={isHighlighted ? "default" : "outline"}
                      size="lg"
                    >
                      {plan.price_monthly === 0 ? "Começar grátis" : "Assinar agora"}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </Card>
            </div>
          );
        })}
      </div>

      {/* Extra info */}
      <p className="text-center text-sm text-muted-foreground mb-20 max-w-3xl mx-auto">
        * Orçamentos extras além do limite do plano: <strong>R$ {extraProposalCost}</strong> por proposta gerada.
        Todos os planos incluem atualizações automáticas e sem fidelidade.
        <br />
        Colaboradores extras: <strong>R$ {extraUserCost}/mês</strong> por vaga adicional.
      </p>

      {/* Lead Plans Section */}
      {leadPlans.length > 0 && (
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 bg-orange-100 text-orange-700 border-orange-200 px-4 py-1.5 text-sm font-semibold">
              🚀 Módulo Extra
            </Badge>
            <h2 className="text-2xl md:text-4xl font-display font-extrabold mb-4">
              Gestão de Leads
            </h2>
            <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto">
              Receba leads qualificados diretamente do nosso simulador público.
              Clientes prontos para comprar, direto no seu painel.
            </p>
          </div>

          <div className={`flex flex-wrap justify-center gap-4 max-w-4xl mx-auto`}>
            {leadPlans.map((lp, idx) => {
              const isBest = leadPlans.length > 1 && idx === 1;
              return (
                <Card
                  key={lp.id}
                  className={`p-6 text-center transition-all duration-300 w-full sm:w-[280px] ${
                    isBest
                      ? "border-orange-400 shadow-lg ring-2 ring-orange-200 scale-[1.03]"
                      : "border-border/50 hover:shadow-card hover:border-orange-300"
                  }`}
                >
                  {isBest && (
                    <Badge className="mb-3 bg-orange-500 text-white border-0 text-xs">
                      Melhor custo-benefício
                    </Badge>
                  )}
                  <h4 className="font-display font-bold text-lg mb-1">{lp.name}</h4>
                  <div className="flex items-baseline justify-center gap-1 mb-2">
                    <span className="text-sm text-muted-foreground">R$</span>
                    <span className={`text-3xl font-display font-extrabold ${
                      isBest ? "text-orange-600" : "text-foreground"
                    }`}>
                      {formatCurrency(lp.price_monthly)}
                    </span>
                    <span className="text-muted-foreground text-sm">/mês</span>
                  </div>
                  <div className="bg-orange-50 rounded-lg py-2 px-3 mb-3">
                    <span className="text-orange-700 font-bold text-lg">{lp.lead_limit}</span>
                    <span className="text-orange-600 text-sm ml-1">leads/mês</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Lead excedente: <strong>R$ {formatCurrency(lp.excess_price)}</strong>/lead
                  </p>
                </Card>
              );
            })}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6 max-w-2xl mx-auto">
            Os planos de Gestão de Leads são add-ons opcionais e podem ser ativados em qualquer plano de assinatura.
          </p>
        </div>
      )}

      {/* CTA Final */}
      <div className="max-w-3xl mx-auto mt-20 text-center">
        <Card className="p-8 md:p-12 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-cyan-500/5">
          <Shield className="w-10 h-10 text-primary mx-auto mb-4" />
          <h3 className="text-2xl md:text-3xl font-display font-extrabold mb-3">
            Ainda tem dúvidas?
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Fale com nossa equipe e descubra o plano ideal para o seu negócio. Sem compromisso.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="https://wa.me/5543999913065?text=Ol%C3%A1%2C%20quero%20saber%20mais%20sobre%20os%20planos%20do%20SimulaPool!"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="lg" className="gradient-primary text-white font-display font-semibold shadow-pool w-full sm:w-auto">
                <MessageSquare className="w-5 h-5 mr-2" />
                Falar no WhatsApp
              </Button>
            </a>
            <Link to="/">
              <Button size="lg" variant="outline" className="font-display font-semibold w-full sm:w-auto">
                Testar grátis
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </section>
  );
};

export default PricingSection;
