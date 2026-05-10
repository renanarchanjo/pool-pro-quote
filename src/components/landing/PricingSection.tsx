import { useEffect, useRef, useState } from "react";
import { Check, X, Users, BarChart3, Shield, Rocket, Crown, Star, Zap, ArrowRight, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface SubPlan {
  id: string; name: string; slug: string; price_monthly: number;
  max_proposals_per_month: number; max_users: number; display_order: number;
}

interface LeadPlan {
  id: string; name: string; price_monthly: number;
  lead_limit: number; excess_price: number; display_order: number;
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

const planFeatures: Record<string, { text: string; included: boolean }[]> = {
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
    { text: "Apareça no topo da busca de lojas", included: true },
  ],
};

const highlightedSlug = "avancado";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ─────────────────────────────────────── */

const PricingSection = ({
  hideLeadPlans = false,
  hideFinalCta = false,
}: {
  hideLeadPlans?: boolean;
  hideFinalCta?: boolean;
}) => {
  const [plans, setPlans] = useState<SubPlan[]>([]);
  const [leadPlans, setLeadPlans] = useState<LeadPlan[]>([]);
  const [extraProposalCost, setExtraProposalCost] = useState("0,50");
  const [extraUserCost, setExtraUserCost] = useState("14,90");
  const [loading, setLoading] = useState(true);
  const gridRef = useRef<HTMLDivElement>(null);

  /* stagger reveal */
  useEffect(() => {
    if (loading) return;
    const grid = gridRef.current;
    if (!grid) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      grid.querySelectorAll<HTMLElement>(".plan-card").forEach((el) => {
        el.style.opacity = "1";
        el.style.transform = "none";
      });
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          grid.querySelectorAll<HTMLElement>(".plan-card").forEach((el, i) => {
            setTimeout(() => {
              el.style.opacity = "1";
              el.style.transform = "none";
            }, i * 120);
          });
          io.unobserve(grid);
        }
      },
      { threshold: 0.1 }
    );
    io.observe(grid);
    return () => io.disconnect();
  }, [loading, plans]);

  useEffect(() => {
    (async () => {
      const [plansRes, leadRes] = await Promise.all([
        supabase.rpc("get_subscription_plans_public"),
        supabase.rpc("get_lead_plans_public"),
      ]);
      if (plansRes.data) setPlans(plansRes.data as SubPlan[]);
      if (leadRes.data) setLeadPlans(leadRes.data as LeadPlan[]);
      // platform_settings is restricted to super_admin; use safe defaults for public pricing
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="py-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      {/* ══════ DARK PRICING STAGE ══════ */}
      <section
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #0B1929 0%, #0F2640 50%, #122D4D 100%)",
        }}
      >
        {/* Ambient glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at center, hsla(199,89%,48%,0.08) 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10 px-4 pt-8 pb-20 md:pt-12 md:pb-28">
          {/* Header */}
          <div className="text-center mb-14 md:mb-16">
            <h1
              className="text-3xl md:text-5xl font-extrabold mb-5 leading-[1.1] tracking-tight"
              style={{ color: "#F1F5F9" }}
            >
              Invista no crescimento{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, hsl(199,89%,58%), hsl(188,95%,50%))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                da sua loja
              </span>
            </h1>
            <p className="text-base md:text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: "#94A3B8" }}>
              Comece grátis, escale conforme sua operação cresce.
              <br className="hidden md:block" />
              Sem fidelidade. Cancele quando quiser.
            </p>
          </div>

          {/* ── GRID ── */}
          <div
            ref={gridRef}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 max-w-[1140px] mx-auto items-stretch"
            style={{ gap: "16px" }}
          >
            {plans.map((plan, idx) => {
              const isHero = plan.slug === highlightedSlug;
              const isFree = plan.slug === "gratuito";
              const icon = planIcons[plan.slug] || <Star className="w-5 h-5" />;
              const features = planFeatures[plan.slug] || [];
              const desc = planDescriptions[plan.slug] || "";
              const usersLabel = plan.max_users >= 999 ? "Usuários ilimitados" : `${plan.max_users} usuário${plan.max_users > 1 ? "s" : ""}`;
              const proposalsLabel = plan.max_proposals_per_month >= 9999
                ? "Orçamentos ilimitados"
                : `${plan.max_proposals_per_month.toLocaleString("pt-BR")} orçamentos/mês`;

              /* Card surface styles */
              const cardBg = isHero
                ? "linear-gradient(168deg, #FFFFFF 0%, #F0F9FF 100%)"
                : isFree
                ? "linear-gradient(168deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)"
                : "linear-gradient(168deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)";

              const cardBorder = isHero
                ? "1px solid hsla(199,89%,48%,0.3)"
                : isFree
                ? "1px solid rgba(255,255,255,0.06)"
                : "1px solid rgba(255,255,255,0.08)";

              const cardShadow = isHero
                ? "0 24px 80px -16px hsla(199,89%,48%,0.28), 0 0 0 1px hsla(199,89%,48%,0.08)"
                : "none";

              /* Text colors on dark vs light */
              const titleColor = isHero ? "#0F172A" : isFree ? "#94A3B8" : "#E2E8F0";
              const descColor = isHero ? "#64748B" : isFree ? "#64748B" : "#94A3B8";
              const priceColor = isHero ? "#0EA5E9" : isFree ? "#64748B" : "#E2E8F0";
              const priceSuffix = isHero ? "#94A3B8" : "#64748B";
              const featureIncluded = isHero ? "#334155" : isFree ? "#94A3B8" : "#CBD5E1";
              const featureExcluded = isHero ? "#CBD5E1" : "#475569";
              const checkColor = isHero ? "#0EA5E9" : isFree ? "#475569" : "#38BDF8";
              const pillBg = isHero ? "hsla(199,89%,48%,0.1)" : "rgba(255,255,255,0.06)";
              const pillText = isHero ? "#0EA5E9" : isFree ? "#64748B" : "#94A3B8";

              return (
                <div
                  key={plan.id}
                  className={`plan-card relative flex flex-col transition-all duration-500 ease-out ${isHero ? "lg:-my-4 lg:-mx-2" : ""}`}
                  style={{
                    opacity: 0,
                    transform: "translateY(24px)",
                    zIndex: isHero ? 10 : 1,
                  }}
                >
                  {/* Hero badge */}
                  {isHero && (
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-20">
                      <span
                        className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] px-5 py-1.5 rounded-full"
                        style={{
                          background: "linear-gradient(135deg, #0EA5E9, #06B6D4)",
                          color: "#FFFFFF",
                          boxShadow: "0 4px 20px -4px hsla(199,89%,48%,0.5)",
                          letterSpacing: "0.16em",
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full animate-pulse"
                          style={{ background: "rgba(255,255,255,0.8)" }}
                        />
                        Mais vendido
                      </span>
                    </div>
                  )}

                  <div
                    className="flex-1 flex flex-col overflow-hidden transition-all duration-300"
                    style={{
                      background: cardBg,
                      border: cardBorder,
                      borderRadius: isHero ? "20px" : "16px",
                      boxShadow: cardShadow,
                      backdropFilter: isHero ? "none" : "blur(12px)",
                      WebkitBackdropFilter: isHero ? "none" : "blur(12px)",
                      transform: "scale(1)",
                      transformOrigin: "center bottom",
                    }}
                    onMouseEnter={(e) => {
                      const t = e.currentTarget;
                      if (isHero) {
                        t.style.transform = "translateY(-8px)";
                        t.style.boxShadow = "0 32px 100px -16px hsla(199,89%,48%,0.35), 0 0 0 1px hsla(199,89%,48%,0.12)";
                      } else {
                        t.style.transform = "translateY(-6px)";
                        t.style.boxShadow = "0 16px 48px -12px rgba(0,0,0,0.3)";
                        t.style.borderColor = "rgba(255,255,255,0.15)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      const t = e.currentTarget;
                      if (isHero) {
                        t.style.transform = "scale(1)";
                        t.style.boxShadow = cardShadow;
                      } else {
                        t.style.transform = "scale(1)";
                        t.style.boxShadow = "none";
                        t.style.borderColor = isFree ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.08)";
                      }
                    }}
                  >
                    {/* Accent bar */}
                    {isHero && (
                      <div
                        className="h-[3px] w-full"
                        style={{ background: "linear-gradient(90deg, #0EA5E9, #06B6D4, #0EA5E9)" }}
                      />
                    )}

                    {/* Header */}
                    <div className="px-6 pt-7 pb-4">
                      <div className="flex items-center gap-2.5 mb-2">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center"
                          style={{
                            background: isHero ? "#0EA5E9" : isFree ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.08)",
                            color: isHero ? "#FFFFFF" : isFree ? "#64748B" : "#94A3B8",
                          }}
                        >
                          {icon}
                        </div>
                        <h3
                          className="text-lg font-bold tracking-tight"
                          style={{ color: titleColor }}
                        >
                          {plan.name}
                        </h3>
                      </div>
                      <p className="text-[13px] leading-relaxed" style={{ color: descColor }}>
                        {desc}
                      </p>
                    </div>

                    {/* Price */}
                    <div className={`px-6 ${isHero ? "pb-5 pt-1" : "pb-4"}`}>
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-[13px] font-medium" style={{ color: priceSuffix }}>R$</span>
                        <span
                          className="font-extrabold leading-none tracking-tight"
                          style={{
                            fontSize: isHero ? "52px" : isFree ? "36px" : "40px",
                            color: priceColor,
                          }}
                        >
                          {fmt(plan.price_monthly)}
                        </span>
                        <span className="text-[12px] ml-1" style={{ color: priceSuffix }}>/mês</span>
                      </div>
                    </div>

                    {/* Pills */}
                    <div className="px-6 pb-4 flex flex-wrap gap-1.5">
                      {[
                        { icon: <Users className="w-3 h-3" />, label: usersLabel },
                        { icon: <BarChart3 className="w-3 h-3" />, label: proposalsLabel },
                      ].map((pill, pi) => (
                        <span
                          key={pi}
                          className="inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-md px-2.5 py-1"
                          style={{ background: pillBg, color: pillText }}
                        >
                          {pill.icon}
                          {pill.label}
                        </span>
                      ))}
                    </div>

                    {/* Divider */}
                    <div
                      className="mx-6"
                      style={{
                        borderTop: isHero ? "1px solid #E2E8F0" : "1px solid rgba(255,255,255,0.06)",
                      }}
                    />

                    {/* Features */}
                    <div className="px-6 py-5 flex-1">
                      <ul className="space-y-3">
                        {features.map((f, fi) => (
                          <li key={fi} className="flex items-start gap-2.5 text-[13px] leading-snug">
                            {f.included ? (
                              <Check className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={2.5} style={{ color: checkColor }} />
                            ) : (
                              <X className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={2} style={{ color: featureExcluded }} />
                            )}
                            <span style={{ color: f.included ? featureIncluded : featureExcluded }}>
                              {f.included ? f.text : <span style={{ textDecoration: "line-through" }}>{f.text}</span>}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* CTA */}
                    <div className="px-6 pb-6 pt-1 space-y-2">
                      <Link to="/auth" className="block">
                        {isHero ? (
                          <button
                            className="w-full font-bold text-[15px] h-[52px] rounded-xl cursor-pointer transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
                            style={{
                              background: "linear-gradient(135deg, #0EA5E9, #06B6D4)",
                              color: "#FFFFFF",
                              boxShadow: "0 6px 24px -4px hsla(199,89%,48%,0.5)",
                              border: "none",
                            }}
                          >
                            <span className="flex items-center justify-center gap-2">
                              {plan.price_monthly === 0 ? "Começar grátis" : "Assinar agora"}
                              <ArrowRight className="w-4 h-4" />
                            </span>
                          </button>
                        ) : (
                          <button
                            className="w-full font-semibold text-[14px] h-11 rounded-xl cursor-pointer transition-all duration-200 hover:scale-[1.02]"
                            style={{
                              background: "transparent",
                              color: isFree ? "#94A3B8" : "#E2E8F0",
                              border: isFree ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(255,255,255,0.12)",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
                              e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = isFree ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.12)";
                              e.currentTarget.style.background = "transparent";
                            }}
                          >
                            <span className="flex items-center justify-center gap-2">
                              {plan.price_monthly === 0 ? "Começar grátis" : "Assinar agora"}
                              <ArrowRight className="w-4 h-4" />
                            </span>
                          </button>
                        )}
                      </Link>
                      <Link to="/login" className="block">
                        <button
                          className="w-full text-[13px] font-medium h-9 rounded-lg cursor-pointer transition-colors duration-200"
                          style={{
                            background: "transparent",
                            color: isHero ? "#64748B" : "#64748B",
                            border: "none",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = isHero ? "#0EA5E9" : "#38BDF8";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = "#64748B";
                          }}
                        >
                          Já tenho conta → Entrar
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footnote */}
          <div className="max-w-3xl mx-auto mt-12">
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} className="pt-6">
              <p className="text-center text-[13px] leading-relaxed" style={{ color: "#64748B" }}>
                * Orçamentos extras além do limite do plano: <strong style={{ color: "#94A3B8" }}>R$ {extraProposalCost}</strong> por proposta gerada.
                Todos os planos incluem atualizações automáticas e sem fidelidade.
                <br />
                Colaboradores extras: <strong style={{ color: "#94A3B8" }}>R$ {extraUserCost}/mês</strong> por vaga adicional.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════ LEAD PLANS (light bg) ══════ */}
      {!hideLeadPlans && leadPlans.length > 0 && (
        <section className="py-16 md:py-24 px-4 bg-background">
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
                    className="rounded-2xl border p-6 text-center transition-all duration-300 w-full sm:w-[280px] group hover:-translate-y-1 bg-card"
                    style={{
                      borderColor: isBest ? "hsla(25,95%,53%,0.25)" : "hsl(var(--border))",
                      boxShadow: isBest ? "0 12px 40px -10px rgba(249,115,22,0.12)" : "0 1px 3px rgba(0,0,0,0.04)",
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
                      <span className={`text-[32px] font-extrabold leading-none tracking-tight ${isBest ? "text-orange-600" : "text-foreground"}`}>
                        {fmt(lp.price_monthly)}
                      </span>
                      <span className="text-[13px] text-muted-foreground/50 ml-1">/mês</span>
                    </div>
                    <div className="bg-orange-50 rounded-lg py-2 px-3 mb-3">
                      <span className="text-orange-700 font-bold text-lg">{lp.lead_limit}</span>
                      <span className="text-orange-600 text-[13px] ml-1">leads/mês</span>
                    </div>
                    <p className="text-[12px] text-muted-foreground/60">
                      Lead excedente: <strong className="text-muted-foreground/80">R$ {fmt(lp.excess_price)}</strong>/lead
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="text-center text-[13px] text-muted-foreground/60 mt-6 max-w-2xl mx-auto">
              Os planos de Gestão de Leads são add-ons opcionais e podem ser ativados em qualquer plano de assinatura.
            </p>
          </div>
        </section>
      )}

      {/* ══════ CTA FINAL ══════ */}
      {!hideFinalCta && (
        <section className="pb-20 px-4 bg-background">
          <div className="max-w-3xl mx-auto text-center">
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
                  <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold w-full sm:w-auto">
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
        </section>
      )}
    </>
  );
};

export default PricingSection;
