import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
}

const plans: Plan[] = [
  {
    name: "Gratuito",
    description: "Ideal para testar e conhecer a plataforma.",
    price: "0,00",
    cta: "Começar grátis",
    features: [
      { text: "10 orçamentos/mês", included: true },
      { text: "1 usuário", included: true },
      { text: "Catálogo de modelos", included: true },
      { text: "Geração de PDF", included: true },
      { text: "Personalização de marca", included: false },
      { text: "Suporte prioritário", included: false },
    ],
  },
  {
    name: "Premium",
    description: "Para quem já vende e quer agilizar.",
    price: "99,90",
    cta: "Escolher plano",
    features: [
      { text: "Tudo do plano Gratuito", included: true, bold: true },
      { text: "100 orçamentos/mês", included: true },
      { text: "3 usuários", included: true },
      { text: "Personalização de marca", included: true },
      { text: "Envio via WhatsApp", included: true },
      { text: "Suporte prioritário", included: true },
    ],
  },
  {
    name: "Avançado",
    description: "Para lojas com alto volume de vendas.",
    price: "199,90",
    popular: true,
    highlighted: true,
    cta: "Escolher plano",
    features: [
      { text: "Tudo do plano Premium", included: true, bold: true },
      { text: "500 orçamentos/mês", included: true },
      { text: "7 usuários", included: true },
      { text: "Relatórios avançados", included: true },
      { text: "Múltiplas lojas", included: true },
      { text: "Suporte VIP", included: true },
    ],
  },
  {
    name: "Escala",
    description: "Para redes e operações de grande porte.",
    price: "299,90",
    cta: "Escolher plano",
    features: [
      { text: "Tudo do plano Avançado", included: true, bold: true },
      { text: "1.000 orçamentos/mês", included: true },
      { text: "Usuários ilimitados", included: true, bold: true },
      { text: "Lojas ilimitadas", included: true, bold: true },
      { text: "API de integração", included: true },
      { text: "Gerente de conta dedicado", included: true },
    ],
  },
];

const PricingSection = () => {
  return (
    <section className="py-20">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-display font-extrabold mb-4">
          Planos que cabem no seu bolso
        </h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Comece grátis e escale conforme sua operação cresce. Sem surpresas, sem taxas escondidas.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
        {plans.map((plan) => (
          <div key={plan.name} className="relative flex flex-col">
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                <span className="bg-primary text-primary-foreground text-xs font-bold px-4 py-1.5 rounded-full shadow-md">
                  Mais vendido
                </span>
              </div>
            )}
            <Card
              className={`flex-1 flex flex-col p-6 transition-all ${
                plan.highlighted
                  ? "border-primary shadow-pool ring-2 ring-primary/20 scale-[1.02]"
                  : "border-border/50 hover:shadow-card"
              }`}
            >
              <div className="mb-6">
                <h3 className="text-xl font-display font-bold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
              </div>

              <div className="mb-6">
                <span className="text-primary text-3xl font-display font-extrabold">
                  R$ {plan.price}
                </span>
                <span className="text-muted-foreground text-sm">/mês</span>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    {feature.included ? (
                      <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    ) : (
                      <X className="w-4 h-4 text-muted-foreground/50 flex-shrink-0 mt-0.5" />
                    )}
                    <span
                      className={
                        feature.included
                          ? feature.bold
                            ? "font-semibold"
                            : ""
                          : "text-muted-foreground/60 line-through"
                      }
                    >
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                className={`w-full font-display font-semibold ${
                  plan.highlighted
                    ? "gradient-primary text-white shadow-pool"
                    : "variant-outline"
                }`}
                variant={plan.highlighted ? "default" : "outline"}
              >
                {plan.cta}
              </Button>
            </Card>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground mt-8 max-w-2xl mx-auto">
        * Orçamentos extras além do limite do plano: R$ 0,50 por orçamento adicional.
        Todos os planos incluem atualizações automáticas e sem fidelidade.
      </p>
    </section>
  );
};

export default PricingSection;
