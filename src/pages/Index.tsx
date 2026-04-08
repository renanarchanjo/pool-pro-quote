import { lazy, Suspense, useState } from "react";
import { ChevronRight, Layers, Briefcase, TrendingUp, Loader2 } from "lucide-react";
import SiteHeader from "@/components/landing/SiteHeader";
import SiteFooter from "@/components/landing/SiteFooter";
import { useForceLightTheme } from "@/hooks/useForceLightTheme";

const PoolSimulator = lazy(() => import("@/components/simulator/PoolSimulator"));

const SimulatorLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#FFFFFF]">
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
    <div className="min-h-screen bg-[#FFFFFF] flex flex-col">
      <SiteHeader onSimulate={() => setShowSimulator(true)} />

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center px-4 py-20 md:py-32">
        <div className="max-w-[600px] mx-auto text-center">
          {/* Eyebrow */}
          <span className="inline-flex items-center bg-[#E0F2FE] text-[#0369A1] text-xs font-semibold px-3 py-1 rounded-md mb-8">
            Orçamento em menos de 1 minuto
          </span>

          <h1 className="text-[28px] md:text-[44px] md:leading-[1.12] font-semibold text-[#0D0D0D] tracking-[-0.02em] mb-5">
            Simule sua piscina de fibra e feche mais vendas.
          </h1>

          <p className="text-[15px] md:text-base text-[#6B7280] max-w-[480px] mx-auto mb-10 leading-relaxed">
            Escolha o modelo, configure os opcionais e envie um orçamento completo para o cliente na hora.
          </p>

          <button
            onClick={() => setShowSimulator(true)}
            className="inline-flex items-center justify-center h-11 px-7 text-[15px] font-semibold rounded-lg bg-primary hover:bg-[#0284C7] text-white transition-all duration-150 mb-8"
          >
            Simular Minha Piscina
            <ChevronRight className="ml-1.5 w-4 h-4" />
          </button>

          <p className="text-[13px] text-[#9CA3AF]">
            ✓ 100% gratuito · ✓ Sem cadastro · ✓ Resultado imediato
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-[#F8F9FA] py-20 px-4">
        <div className="max-w-[960px] mx-auto">
          <div className="text-center mb-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF] mb-3">
              POR QUE SIMULAPOOL
            </p>
            <h2 className="text-[22px] md:text-[28px] font-semibold text-[#0D0D0D]">
              Tudo que um lojista precisa para vender mais
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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
                className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl p-6"
              >
                <div className="w-9 h-9 rounded-lg bg-[#E0F2FE] flex items-center justify-center mb-4">
                  <card.icon className="w-[18px] h-[18px] text-primary" strokeWidth={1.5} />
                </div>
                <h3 className="text-[15px] font-semibold text-[#0D0D0D] mb-2">{card.title}</h3>
                <p className="text-[13px] text-[#6B7280] leading-relaxed">{card.description}</p>
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
