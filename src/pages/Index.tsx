import { lazy, Suspense, useState } from "react";
import { ChevronRight, Check, Sparkles, Loader2 } from "lucide-react";
import SiteHeader from "@/components/landing/SiteHeader";
import SiteFooter from "@/components/landing/SiteFooter";
import PartnersMarquee from "@/components/landing/PartnersMarquee";
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
      <section className="flex-1 flex items-center justify-center px-4 py-12 md:py-28 relative overflow-hidden">
        {/* Tech grid background — desktop only */}
        <div
          className="hidden md:block absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(14,165,233,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(14,165,233,0.04) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* Blob 1 — blue */}
        <div
          className="hidden md:block absolute top-[-100px] left-[-100px] w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(14,165,233,0.06) 0%, transparent 70%)",
          }}
        />
        {/* Blob 2 — green */}
        <div
          className="hidden md:block absolute bottom-0 right-[-80px] w-[300px] h-[300px] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(34,197,94,0.07) 0%, transparent 70%)",
          }}
        />

        <div className="max-w-[600px] mx-auto text-center relative z-10">
          {/* Eyebrow chip — green */}
          <span className="inline-flex items-center gap-1.5 bg-[#F0FDF4] border border-[#86EFAC] text-[#166534] text-xs font-semibold px-3 py-1 rounded-md mb-6 md:mb-8 transition-all duration-200">
            <Sparkles className="w-4 h-4 text-[#16A34A]" />
            Mais de 200 modelos de piscinas de fibra
          </span>

          <h1 className="text-[28px] leading-[1.2] md:text-[44px] md:leading-[1.12] font-semibold text-[#0D0D0D] tracking-[-0.02em] mb-4 md:mb-5">
            Descubra o <span className="text-[#16A34A]">preço</span> da sua piscina em menos de 1 minuto
          </h1>

          <p className="text-[15px] md:text-base text-[#6B7280] max-w-[480px] mx-auto mb-8 md:mb-10 leading-relaxed">
            Escolha o tamanho, os opcionais e receba seu orçamento completo na hora — sem precisar falar com vendedor.
          </p>

          {/* CTA Button — green with shimmer */}
          <button
            onClick={() => setShowSimulator(true)}
            className="group w-full md:w-auto inline-flex items-center justify-center h-12 px-8 text-[15px] font-semibold rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white transition-all duration-200 mb-6 md:mb-8 relative overflow-hidden"
          >
            <span className="relative z-10 inline-flex items-center">
              Simular Minha Piscina
              <ChevronRight className="ml-1.5 w-4 h-4" />
            </span>
            {/* Shimmer overlay on hover */}
            <span
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                backgroundImage: "linear-gradient(90deg, #16A34A 0%, #22C55E 50%, #16A34A 100%)",
                backgroundSize: "200% auto",
                animation: "shimmer 1.5s linear infinite",
              }}
            />
          </button>

          {/* Trust badges — green pills */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mb-8">
            {["Grátis", "Sem cadastro", "Resultado na hora"].map((text) => (
              <span
                key={text}
                className="inline-flex items-center gap-1.5 bg-[#F0FDF4] border border-[#86EFAC] rounded-full px-3.5 py-1.5 text-[13px] font-medium text-[#166534] transition-all duration-200"
              >
                <Check className="w-3 h-3 text-[#16A34A]" />
                {text}
              </span>
            ))}
          </div>

          {/* Social proof metrics */}
          <div className="max-w-[300px] mx-auto mb-0">
            <div className="h-px bg-[#E5E7EB] mb-5" />
            <div className="flex items-center justify-center gap-8 md:gap-10">
              <div className="text-center">
                <p className="text-[22px] font-bold text-[#0D0D0D] leading-tight">4.800+</p>
                <p className="text-[12px] text-[#6B7280]">orçamentos gerados</p>
              </div>
              <div className="text-center">
                <p className="text-[22px] font-bold text-[#0D0D0D] leading-tight">200+</p>
                <p className="text-[12px] text-[#6B7280]">modelos disponíveis</p>
              </div>
              <div className="text-center">
                <p className="text-[22px] font-bold text-[#16A34A] leading-tight">&lt; 1 min</p>
                <p className="text-[12px] text-[#6B7280]">para seu orçamento</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Como Funciona */}
      <section className="bg-[#FFFFFF] py-12 md:py-20 px-4">
        <div className="max-w-[960px] mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF] mb-3">
              COMO FUNCIONA
            </p>
            <h2 className="text-[22px] md:text-[28px] font-semibold text-[#0D0D0D]">
              Do sonho ao orçamento em 3 passos
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
            {[
              {
                step: "1",
                title: "Escolha o modelo",
                description: "Navegue por modelos de piscinas de fibra por tamanho, formato e estilo. Tem opção pra todo espaço e orçamento.",
              },
              {
                step: "2",
                title: "Monte do seu jeito",
                description: "Adicione escada, iluminação, aquecimento e outros opcionais. O preço atualiza em tempo real conforme você personaliza.",
              },
              {
                step: "3",
                title: "Receba seu orçamento",
                description: "Seu orçamento detalhado fica pronto na hora, com todos os itens selecionados. Salve em PDF ou compartilhe direto pelo WhatsApp.",
              },
            ].map((card) => (
              <div
                key={card.step}
                className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl p-6"
              >
                <div className="w-10 h-10 rounded-lg bg-[#E0F2FE] flex items-center justify-center mb-4">
                  <span className="text-[18px] font-bold text-[#0369A1]">{card.step}</span>
                </div>
                <h3 className="text-[15px] font-semibold text-[#0D0D0D] mb-2">{card.title}</h3>
                <p className="text-[13px] text-[#6B7280] leading-relaxed">{card.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PartnersMarquee />

      {/* CTA Final */}
      <section className="bg-[#0EA5E9] py-14 md:py-20 px-4">
        <div className="max-w-[520px] mx-auto text-center">
          <h2 className="text-[22px] md:text-[28px] font-semibold text-white mb-3 md:mb-4">
            Sua piscina pode estar pronta antes do verão
          </h2>
          <p className="text-[15px] text-white/80 mb-8 md:mb-10 leading-relaxed">
            Simule agora, sem compromisso. É grátis e leva menos de 1 minuto.
          </p>

          <button
            onClick={() => setShowSimulator(true)}
            className="w-full md:w-auto inline-flex items-center justify-center h-11 px-7 text-[15px] font-semibold rounded-lg bg-white text-[#0EA5E9] hover:bg-white/90 transition-all duration-150 mb-5"
          >
            Simular Minha Piscina
            <ChevronRight className="ml-1.5 w-4 h-4" />
          </button>

          <p className="text-[13px] text-white/70">
            Sem cadastro · Sem compromisso · 100% gratuito
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};

export default Index;
