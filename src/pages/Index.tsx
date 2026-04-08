import { lazy, Suspense, useState } from "react";
import { ChevronRight, Layers, Briefcase, TrendingUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import SiteHeader from "@/components/landing/SiteHeader";
import SiteFooter from "@/components/landing/SiteFooter";
import { useForceLightTheme } from "@/hooks/useForceLightTheme";

const PoolSimulator = lazy(() => import("@/components/simulator/PoolSimulator"));

const SimulatorLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const Index = () => {
  useForceLightTheme();
  const [showSimulator, setShowSimulator] = useState(false);

  if (showSimulator) {
    return (
      <Suspense fallback={<SimulatorLoader />}>
        <PoolSimulator onBack={() => setShowSimulator(false)} />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader onSimulate={() => setShowSimulator(true)} />

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center px-4 py-16 md:py-24">
        <div className="max-w-[640px] mx-auto text-center">
          {/* Eyebrow */}
          <span className="inline-block bg-[#E0F2FE] text-[#0369A1] text-xs font-semibold px-3 py-1 rounded-md mb-6">
            Orçamento em menos de 1 minuto
          </span>

          <h1 className="text-3xl md:text-[44px] md:leading-[1.15] font-semibold text-foreground tracking-tight mb-4">
            Simule sua piscina de fibra e feche mais vendas.
          </h1>

          <p className="text-base md:text-[16px] text-muted-foreground max-w-[520px] mx-auto mb-8 leading-relaxed">
            Escolha o modelo, configure os opcionais e envie um orçamento completo para o cliente na hora.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
            <Button
              onClick={() => setShowSimulator(true)}
              className="h-11 px-7 text-[15px] font-semibold rounded-lg bg-primary hover:bg-[#0284C7] text-white transition-all duration-150"
            >
              Simular Minha Piscina
              <ChevronRight className="ml-1.5 w-4 h-4" />
            </Button>
            <button
              onClick={() => {
                const el = document.getElementById("features");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150"
            >
              Ver como funciona
            </button>
          </div>

          <div className="flex items-center justify-center gap-4 text-[13px] text-muted-foreground">
            <span>✓ 100% gratuito</span>
            <span>✓ Sem cadastro obrigatório</span>
            <span>✓ Resultado imediato</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-secondary py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-3">
              POR QUE SIMULAPOOL
            </p>
            <h2 className="text-2xl md:text-[28px] font-semibold text-foreground">
              Tudo que um lojista precisa para vender piscinas
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                icon: Layers,
                title: "Opcionais Flexíveis",
                description: "Configure qualquer combinação de modelos e acessórios em segundos.",
              },
              {
                icon: Briefcase,
                title: "Pensado para Lojistas",
                description: "Painel comercial completo para acompanhar propostas e negociações.",
              },
              {
                icon: TrendingUp,
                title: "Mais Conversão",
                description: "Propostas em PDF prontas para enviar e fechar negócio na hora.",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="bg-card border border-border rounded-xl p-6"
              >
                <div className="w-9 h-9 rounded-lg bg-[#E0F2FE] flex items-center justify-center mb-4">
                  <card.icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
                </div>
                <h3 className="text-[15px] font-semibold text-foreground mb-2">{card.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{card.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};

export default Index;
