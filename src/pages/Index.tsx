import { lazy, Suspense, useState } from "react";
import { ChevronRight, Loader2, Check } from "lucide-react";
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
      <section
        className="hero-gradient relative flex-1 flex items-center justify-center px-4 py-12 md:py-32 overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #0F172A 0%, #0F172A 30%, #0C2340 55%, #F8FBFF 85%, #FFFFFF 100%)',
        }}
      >
        {/* Background grid + blobs — hidden on mobile */}
        <div
          className="hidden md:block absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div
          className="hidden md:block absolute pointer-events-none rounded-full"
          style={{
            width: 480,
            height: 480,
            top: -100,
            left: -100,
            background: "radial-gradient(circle, rgba(14,165,233,0.12) 0%, transparent 70%)",
          }}
        />
        <div
          className="hidden md:block absolute pointer-events-none rounded-full"
          style={{
            width: 420,
            height: 420,
            bottom: 0,
            right: -80,
            background: "radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 70%)",
          }}
        />

        <div className="relative max-w-[600px] mx-auto text-center z-10">
          {/* Eyebrow chip */}
          <span
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-md mb-6 md:mb-8"
            style={{
              background: "rgba(14,165,233,0.15)",
              border: "1px solid rgba(56,189,248,0.4)",
              color: "#7DD3FC",
            }}
          >
            <span style={{ color: "#38BDF8" }}>✦</span>
            Mais de 200 modelos de piscinas de fibra
          </span>

          <h1 className="text-[28px] leading-[1.2] md:text-[44px] md:leading-[1.12] font-semibold text-white tracking-[-0.02em] mb-4 md:mb-5">
            Descubra o{" "}
            <span style={{ color: "#38BDF8" }}>preço</span>{" "}
            da sua piscina em menos de 1 minuto
          </h1>

          <p className="text-[15px] md:text-base max-w-[480px] mx-auto mb-8 md:mb-10 leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
            Escolha o tamanho, os opcionais e receba seu orçamento completo na hora — sem precisar falar com vendedor.
          </p>

          {/* CTA with shimmer */}
          <button
            onClick={() => setShowSimulator(true)}
            className="group w-full md:w-auto inline-flex items-center justify-center h-11 px-7 text-[15px] font-semibold rounded-lg text-white transition-all duration-200 mb-6 md:mb-8"
            style={{ backgroundColor: "#0EA5E9" }}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.backgroundImage = "linear-gradient(90deg, #0EA5E9 0%, #38BDF8 50%, #0EA5E9 100%)";
              el.style.backgroundSize = "200% auto";
              el.style.animation = "shimmer 1.5s linear infinite";
              el.style.backgroundColor = "#0284C7";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.backgroundImage = "none";
              el.style.animation = "none";
              el.style.backgroundColor = "#0EA5E9";
            }}
          >
            Simular Minha Piscina
            <ChevronRight className="ml-1.5 w-4 h-4" />
          </button>

          {/* Trust pills */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-3 mb-10 md:mb-12">
            {["Grátis", "Sem cadastro", "Resultado na hora"].map((label) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 text-[13px] font-medium rounded-full"
                style={{
                  background: "rgba(14,165,233,0.1)",
                  border: "1px solid rgba(56,189,248,0.25)",
                  color: "rgba(255,255,255,0.8)",
                  padding: "6px 14px",
                }}
              >
                <Check className="w-3.5 h-3.5" style={{ color: "#38BDF8" }} />
                {label}
              </span>
            ))}
          </div>

          {/* Social proof metrics */}
          <div className="flex items-center justify-center gap-0">
            <div className="text-center px-5">
              <p className="text-[22px] font-bold text-white">4.800+</p>
              <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.5)' }}>orçamentos gerados</p>
            </div>
            <div className="w-px h-10" style={{ background: 'rgba(255,255,255,0.1)' }} />
            <div className="text-center px-5">
              <p className="text-[22px] font-bold text-white">200+</p>
              <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.5)' }}>modelos disponíveis</p>
            </div>
            <div className="w-px h-10" style={{ background: 'rgba(255,255,255,0.1)' }} />
            <div className="text-center px-5">
              <p className="text-[22px] font-bold" style={{ color: "#38BDF8" }}>&lt; 1 min</p>
              <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.5)' }}>para seu orçamento</p>
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
