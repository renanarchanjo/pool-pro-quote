import { useEffect, useRef, useState } from "react";
import { Check, X, Users, BarChart3, Shield, Rocket, Crown, Star, Zap, ArrowRight, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  gratuito: <Zap className="w-5 h-5" />,
  premium: <Star className="w-5 h-5" />,
  avancado: <Rocket className="w-5 h-5" />,
  escala: <Crown className="w-5 h-5" />,
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

const PricingSection = ({ hideLeadPlans = false, hideFinalCta = false }: { hideLeadPlans?: boolean; hideFinalCta?: boolean }) => {
  const [plans, setPlans] = useState<SubPlan[]>([]);
  const [leadPlans, setLeadPlans] = useState<LeadPlan[]>([]);
  const [extraProposalCost, setExtraProposalCost] = useState("0,50");
  const [extraUserCost, setExtraUserCost] = useState("14,90");
  const [loading, setLoading] = useState(true);
  const plansGridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loading) return;
    const grid = plansGridRef.current;
    if (!grid) return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      grid.querySelectorAll(".stagger-card").forEach((el) => el.classList.add("stagger-visible"));
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          grid.querySelectorAll(".stagger-card").forEach((el, i) => {
            (el as HTMLElement).style.transitionDelay = `${i * 100}ms`;
            el.classList.add("stagger-visible");
          });
          observer.unobserve(grid);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(grid);
    return () => observer.disconnect();
  }, [loading, plans]);

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
      {/* Header */}
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

      {/* Plans Grid — asymmetric layout */}
      <div
        ref={plansGridRef}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 lg:gap-0 max-w-[1100px] mx-auto mb-10 items-end lg:px-2"
      >
        {plans.map((plan) => {
          const isHighlighted = plan.slug === highlightedSlug;
          const isFree = plan.slug === "gratuito";
          const icon = planIcons[plan.slug] || <Star className="w-5 h-5" />;
          const features = planFeatures[plan.slug] || [];
          const description = planDescriptions[plan.slug] || "";
          const usersLabel = plan.max_users >= 999 ? "Usuários ilimitados" : `${plan.max_users} usuário${plan.max_users > 1 ? "s" : ""}`;
          const proposalsLabel = plan.max_proposals_per_month >= 9999
            ? "Orçamentos ilimitados"
            : `${plan.max_proposals_per_month.toLocaleString("pt-BR")} orçamentos/mês`;

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col stagger-card transition-all duration-300 px-2 mb-4 lg:mb-0 ${
                isHighlighted ? "lg:z-10" : "lg:z-0"
              }`}
              style={isHighlighted ? { transform: "scale(1.08)", transformOrigin: "center bottom" } : undefined}
            >
              {/* Badge */}
              {isHighlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                  <span
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] px-5 py-1.5 rounded-full text-primary-foreground"
                    style={{
                      background: "linear-gradient(135deg, hsl(199 89% 48%), hsl(188 95% 42%))",
                      boxShadow: "0 4px 14px -2px hsla(199, 89%, 48%, 0.4)",
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground/80 animate-pulse" />
                    Mais vendido
                  </span>
                </div>
              )}

              <div
                className={`flex-1 flex flex-col rounded-2xl border overflow-hidden transition-all duration-300 group ${
                  isHighlighted
                    ? "border-primary/50 bg-card"
                    : isFree
                    ? "border-border/60 bg-card/80"
                    : "border-border bg-card"
                }`}
                style={
                  isHighlighted
                    ? {
                        boxShadow: "0 20px 60px -15px hsla(199, 89%, 48%, 0.22), 0 8px 24px -8px rgba(0,0,0,0.08)",
                      }
                    : {
                        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                      }
                }
                onMouseEnter={(e) => {
                  if (!isHighlighted) {
                    e.currentTarget.style.boxShadow = "0 8px 32px -8px rgba(0,0,0,0.1)";
                    e.currentTarget.style.transform = "translateY(-4px)";
                  } else {
                    e.currentTarget.style.boxShadow = "0 24px 72px -15px hsla(199, 89%, 48%, 0.3), 0 12px 32px -8px rgba(0,0,0,0.1)";
                    e.currentTarget.style.transform = "translateY(-6px)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isHighlighted) {
                    e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
                    e.currentTarget.style.transform = "translateY(0)";
                  } else {
                    e.currentTarget.style.boxShadow = "0 20px 60px -15px hsla(199, 89%, 48%, 0.22), 0 8px 24px -8px rgba(0,0,0,0.08)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }
                }}
              >
                {/* Accent top bar for highlighted */}
                {isHighlighted && (
                  <div
                    className="h-1 w-full"
                    style={{ background: "linear-gradient(90deg, hsl(199 89% 48%), hsl(188 95% 42%))" }}
                  />
                )}

                {/* Plan Header */}
                <div className={`px-6 pt-7 pb-4 ${isHighlighted ? "bg-primary/[0.03]" : ""}`}>
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                      isHighlighted
                        ? "bg-primary text-primary-foreground"
                        : isFree
                        ? "bg-muted text-muted-foreground/60"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {icon}
                    </div>
                    <h3 className={`text-lg font-bold tracking-tight ${
                      isFree ? "text-foreground/70" : "text-foreground"
                    }`}>{plan.name}</h3>
                  </div>
                  <p className={`text-[13px] leading-relaxed ${
                    isFree ? "text-muted-foreground/60" : "text-muted-foreground"
                  }`}>{description}</p>
                </div>

                {/* Price — dominant for highlighted */}
                <div className={`px-6 ${isHighlighted ? "pb-5 pt-1" : "pb-4"}`}>
                  <div className="flex items-baseline gap-0.5">
                    <span className={`font-medium ${
                      isHighlighted ? "text-[14px] text-primary/70" : "text-[13px] text-muted-foreground"
                    }`}>R$</span>
                    <span className={`font-extrabold leading-none tracking-tight ${
                      isHighlighted
                        ? "text-[48px] text-primary"
                        : isFree
                        ? "text-[36px] text-foreground/60"
                        : "text-[38px] text-foreground"
                    }`}>
                      {formatCurrency(plan.price_monthly)}
                    </span>
                    <span className={`ml-1 ${
                      isHighlighted ? "text-[13px] text-primary/50" : "text-[12px] text-muted-foreground/50"
                    }`}>/mês</span>
                  </div>
                </div>

                {/* Metrics pills */}
                <div className="px-6 pb-4 flex flex-wrap gap-1.5">
                  <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-md px-2.5 py-1 ${
                    isHighlighted
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground/70"
                  }`}>
                    <Users className="w-3 h-3" />
                    {usersLabel}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-md px-2.5 py-1 ${
                    isHighlighted
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground/70"
                  }`}>
                    <BarChart3 className="w-3 h-3" />
                    {proposalsLabel}
                  </span>
                </div>

                {/* Divider */}
                <div className={`mx-6 border-t ${isHighlighted ? "border-primary/15" : "border-border"}`} />

                {/* Features */}
                <div className="px-6 py-5 flex-1">
                  <ul className="space-y-3">
                    {features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-[13px] leading-snug">
                        {feature.included ? (
                          <Check
                            className={`w-4 h-4 shrink-0 mt-0.5 ${
                              isHighlighted ? "text-primary" : "text-primary/60"
                            }`}
                            strokeWidth={2.5}
                          />
                        ) : (
                          <X className="w-4 h-4 text-muted-foreground/25 shrink-0 mt-0.5" strokeWidth={2} />
                        )}
                        <span className={
                          feature.included
                            ? isFree ? "text-foreground/70" : "text-foreground"
                            : "text-muted-foreground/35 line-through"
                        }>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA — aggressive for highlighted */}
                <div className="px-6 pb-6 pt-1 space-y-2">
                  <Link to="/auth">
                    {isHighlighted ? (
                      <button
                        className="w-full font-bold text-[15px] h-12 rounded-xl text-primary-foreground transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] cursor-pointer"
                        style={{
                          background: "linear-gradient(135deg, hsl(199 89% 48%), hsl(188 95% 42%))",
                          boxShadow: "0 4px 20px -4px hsla(199, 89%, 48%, 0.45)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = "0 6px 28px -4px hsla(199, 89%, 48%, 0.55)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = "0 4px 20px -4px hsla(199, 89%, 48%, 0.45)";
                        }}
                      >
                        <span className="flex items-center justify-center gap-2">
                          {plan.price_monthly === 0 ? "Começar grátis" : "Assinar agora"}
                          <ArrowRight className="w-4 h-4" />
                        </span>
                      </button>
                    ) : (
                      <Button
                        className={`w-full font-semibold h-11 transition-all duration-200 hover:scale-[1.02] ${
                          isFree ? "text-muted-foreground" : ""
                        }`}
                        variant="outline"
                        size="lg"
                      >
                        {plan.price_monthly === 0 ? "Começar grátis" : "Assinar agora"}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    )}
                  </Link>
                  <Link to="/login">
                    <Button
                      variant="ghost"
                      className="w-full text-[13px] text-muted-foreground hover:text-primary font-medium h-9"
                    >
                      Já tenho conta → Entrar
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Extra info */}
      <div className="max-w-3xl mx-auto mb-20">
        <div className="border-t border-border/50 pt-6">
          <p className="text-center text-[13px] text-muted-foreground/60 leading-relaxed">
            * Orçamentos extras além do limite do plano: <strong className="text-muted-foreground/80">R$ {extraProposalCost}</strong> por proposta gerada.
            Todos os planos incluem atualizações automáticas e sem fidelidade.
            <br />
            Colaboradores extras: <strong className="text-muted-foreground/80">R$ {extraUserCost}/mês</strong> por vaga adicional.
          </p>
        </div>
      </div>

      {/* Lead Plans Section */}
      {!hideLeadPlans && leadPlans.length > 0 && (
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

          <div className="flex flex-wrap justify-center gap-5 max-w-4xl mx-auto">
            {leadPlans.map((lp, idx) => {
              const isBest = leadPlans.length > 1 && idx === 1;
              return (
                <div
                  key={lp.id}
                  className={`rounded-2xl border p-6 text-center transition-all duration-300 w-full sm:w-[280px] group hover:-translate-y-1 ${
                    isBest
                      ? "border-orange-300/60 bg-card"
                      : "border-border bg-card"
                  }`}
                  style={isBest ? {
                    boxShadow: "0 12px 40px -10px rgba(249,115,22,0.15)",
                  } : {
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  }}
                >
                  {isBest && (
                    <Badge className="mb-3 bg-orange-500 text-white border-0 text-[11px] font-bold uppercase tracking-wider">
                      Melhor custo-benefício
                    </Badge>
                  )}
                  <h4 className="font-bold text-lg mb-1 text-foreground">{lp.name}</h4>
                  <div className="flex items-baseline justify-center gap-0.5 mb-3">
                    <span className="text-[13px] font-medium text-muted-foreground">R$</span>
                    <span className={`text-[32px] font-extrabold leading-none tracking-tight ${
                      isBest ? "text-orange-600" : "text-foreground"
                    }`}>
                      {formatCurrency(lp.price_monthly)}
                    </span>
                    <span className="text-[13px] text-muted-foreground/50 ml-1">/mês</span>
                  </div>
                  <div className="bg-orange-50 rounded-lg py-2 px-3 mb-3">
                    <span className="text-orange-700 font-bold text-lg lead-number-pulse inline-block">{lp.lead_limit}</span>
                    <span className="text-orange-600 text-[13px] ml-1">leads/mês</span>
                  </div>
                  <p className="text-[12px] text-muted-foreground/60">
                    Lead excedente: <strong className="text-muted-foreground/80">R$ {formatCurrency(lp.excess_price)}</strong>/lead
                  </p>
                </div>
              );
            })}
          </div>

          <p className="text-center text-[13px] text-muted-foreground/60 mt-6 max-w-2xl mx-auto">
            Os planos de Gestão de Leads são add-ons opcionais e podem ser ativados em qualquer plano de assinatura.
          </p>
        </div>
      )}

      {/* CTA Final */}
      {!hideFinalCta && (
        <div className="max-w-3xl mx-auto mt-20 text-center">
          <div className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.03] via-card to-cyan-500/[0.03] p-8 md:p-12">
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
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold w-full sm:w-auto"
                  style={{ boxShadow: "0 4px 16px -4px hsla(199, 89%, 48%, 0.35)" }}
                >
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Falar no WhatsApp
                </Button>
              </a>
              <Link to="/">
                <Button size="lg" variant="outline" className="font-semibold w-full sm:w-auto">
                  Testar grátis
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default PricingSection;
