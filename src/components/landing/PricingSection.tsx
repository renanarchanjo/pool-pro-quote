import { Check, X, Zap, Users, BarChart3, Shield, Rocket, Crown, Star, ArrowRight, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

interface PlanFeature {
  text: string;
  included: boolean;
  bold?: boolean;
}

interface Plan {
  name: string;
  description: string;
  price: string;
  popular?: boolean;
  features: PlanFeature[];
  cta: string;
  highlighted?: boolean;
  icon: React.ReactNode;
  badge?: string;
  usersLabel: string;
  proposalsLabel: string;
}

const plans: Plan[] = [
  {
    name: "Gratuito",
    description: "Conheça a plataforma sem compromisso.",
    price: "0",
    cta: "Começar grátis",
    icon: <Zap className="w-6 h-6" />,
    usersLabel: "1 usuário",
    proposalsLabel: "10 orçamentos/mês",
    features: [
      { text: "Catálogo de modelos de piscinas", included: true },
      { text: "Geração de PDF profissional", included: true },
      { text: "Simulador público integrado", included: true },
      { text: "Personalização de marca", included: false },
      { text: "Gestão de equipe", included: false },
      { text: "Suporte prioritário", included: false },
    ],
  },
  {
    name: "Premium",
    description: "Para quem já vende e quer agilizar.",
    price: "99,90",
    cta: "Assinar agora",
    icon: <Star className="w-6 h-6" />,
    usersLabel: "3 usuários",
    proposalsLabel: "100 orçamentos/mês",
    features: [
      { text: "Tudo do plano Gratuito", included: true, bold: true },
      { text: "Personalização completa de marca", included: true },
      { text: "Opcionais e grupos personalizáveis", included: true },
      { text: "Envio via WhatsApp integrado", included: true },
      { text: "Relatórios de performance", included: false },
      { text: "Múltiplas lojas", included: false },
    ],
  },
  {
    name: "Avançado",
    description: "Para lojas com alto volume de vendas.",
    price: "199,90",
    popular: true,
    highlighted: true,
    cta: "Escolher plano",
    icon: <Rocket className="w-6 h-6" />,
    badge: "Mais vendido",
    usersLabel: "7 usuários",
    proposalsLabel: "500 orçamentos/mês",
    features: [
      { text: "Tudo do plano Premium", included: true, bold: true },
      { text: "Relatórios avançados de equipe", included: true },
      { text: "Comissões por vendedor", included: true },
      { text: "Dashboard de performance", included: true },
      { text: "Múltiplas lojas", included: true },
      { text: "Suporte VIP", included: true },
    ],
  },
  {
    name: "Escala",
    description: "Para redes e operações de grande porte.",
    price: "299,90",
    cta: "Falar com especialista",
    icon: <Crown className="w-6 h-6" />,
    usersLabel: "Usuários ilimitados",
    proposalsLabel: "1.000 orçamentos/mês",
    features: [
      { text: "Tudo do plano Avançado", included: true, bold: true },
      { text: "Lojas ilimitadas", included: true, bold: true },
      { text: "API de integração", included: true },
      { text: "Gerente de conta dedicado", included: true },
      { text: "Onboarding personalizado", included: true },
      { text: "SLA de suporte garantido", included: true },
    ],
  },
];

interface LeadPlan {
  name: string;
  price: string;
  leads: number;
  excessPrice: string;
  highlight?: boolean;
}

const leadPlans: LeadPlan[] = [
  { name: "Plano 1", price: "997", leads: 100, excessPrice: "15,00" },
  { name: "Plano 2", price: "1.497", leads: 150, excessPrice: "12,00", highlight: true },
  { name: "Plano 3", price: "1.997", leads: 200, excessPrice: "10,00" },
  { name: "Plano 4", price: "2.497", leads: 250, excessPrice: "8,00" },
];

const PricingSection = () => {
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto mb-8">
        {plans.map((plan) => (
          <div key={plan.name} className="relative flex flex-col group">
            {plan.badge && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                <span className="gradient-primary text-white text-xs font-bold px-5 py-1.5 rounded-full shadow-lg whitespace-nowrap">
                  🔥 {plan.badge}
                </span>
              </div>
            )}
            <Card
              className={`flex-1 flex flex-col p-0 overflow-hidden transition-all duration-300 ${
                plan.highlighted
                  ? "border-primary shadow-pool ring-2 ring-primary/20 scale-[1.03]"
                  : "border-border/50 hover:shadow-card hover:border-primary/30"
              }`}
            >
              {/* Plan Header */}
              <div className={`px-6 pt-6 pb-4 ${plan.highlighted ? "bg-primary/5" : ""}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    plan.highlighted 
                      ? "gradient-primary text-white" 
                      : "bg-primary/10 text-primary"
                  }`}>
                    {plan.icon}
                  </div>
                  <h3 className="text-xl font-display font-bold">{plan.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </div>

              {/* Price */}
              <div className="px-6 py-4 border-y border-border/30">
                <div className="flex items-baseline gap-1">
                  <span className="text-sm text-muted-foreground">R$</span>
                  <span className={`text-4xl font-display font-extrabold ${
                    plan.highlighted ? "text-primary" : "text-foreground"
                  }`}>
                    {plan.price}
                  </span>
                  <span className="text-muted-foreground text-sm">/mês</span>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="px-6 py-3 flex gap-3">
                <div className="flex items-center gap-1.5 text-xs font-medium bg-primary/5 text-primary rounded-full px-3 py-1.5">
                  <Users className="w-3.5 h-3.5" />
                  {plan.usersLabel}
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium bg-primary/5 text-primary rounded-full px-3 py-1.5">
                  <BarChart3 className="w-3.5 h-3.5" />
                  {plan.proposalsLabel}
                </div>
              </div>

              {/* Features */}
              <div className="px-6 py-4 flex-1">
                <ul className="space-y-2.5">
                  {plan.features.map((feature, idx) => (
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
                      plan.highlighted
                        ? "gradient-primary text-white shadow-pool hover:shadow-lg transition-shadow"
                        : ""
                    }`}
                    variant={plan.highlighted ? "default" : "outline"}
                    size="lg"
                  >
                    {plan.cta}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        ))}
      </div>

      {/* Extra info */}
      <p className="text-center text-sm text-muted-foreground mb-20 max-w-3xl mx-auto">
        * Orçamentos extras além do limite do plano: <strong>R$ 0,50</strong> por proposta gerada.
        Todos os planos incluem atualizações automáticas e sem fidelidade.
        <br />
        Colaboradores extras: <strong>R$ 49,90/mês</strong> por vaga adicional.
      </p>

      {/* Lead Plans Section */}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {leadPlans.map((lp) => (
            <Card
              key={lp.name}
              className={`p-6 text-center transition-all duration-300 ${
                lp.highlight
                  ? "border-orange-400 shadow-lg ring-2 ring-orange-200 scale-[1.03]"
                  : "border-border/50 hover:shadow-card hover:border-orange-300"
              }`}
            >
              {lp.highlight && (
                <Badge className="mb-3 bg-orange-500 text-white border-0 text-xs">
                  Melhor custo-benefício
                </Badge>
              )}
              <h4 className="font-display font-bold text-lg mb-1">{lp.name}</h4>
              <div className="flex items-baseline justify-center gap-1 mb-2">
                <span className="text-sm text-muted-foreground">R$</span>
                <span className={`text-3xl font-display font-extrabold ${
                  lp.highlight ? "text-orange-600" : "text-foreground"
                }`}>
                  {lp.price}
                </span>
                <span className="text-muted-foreground text-sm">/mês</span>
              </div>
              <div className="bg-orange-50 rounded-lg py-2 px-3 mb-3">
                <span className="text-orange-700 font-bold text-lg">{lp.leads}</span>
                <span className="text-orange-600 text-sm ml-1">leads/mês</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Lead excedente: <strong>R$ {lp.excessPrice}</strong>/lead
              </p>
            </Card>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6 max-w-2xl mx-auto">
          Os planos de Gestão de Leads são add-ons opcionais e podem ser ativados em qualquer plano de assinatura.
        </p>
      </div>

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
