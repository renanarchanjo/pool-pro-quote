import { lazy, Suspense, useState, useCallback } from "react";
import { Loader2, ArrowRight } from "lucide-react";
import PageSEO from "@/components/PageSEO";
import { motion } from "framer-motion";
import SiteHeader from "@/components/landing/SiteHeader";
import SiteFooter from "@/components/landing/SiteFooter";
import HowItWorks from "@/components/landing/HowItWorks";
import PartnersMarquee from "@/components/landing/PartnersMarquee";
import { useForceLightTheme } from "@/hooks/useForceLightTheme";

const PoolSimulator = lazy(() => import("@/components/simulator/PoolSimulator"));

const SimulatorLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background" role="status" aria-label="Carregando simulador">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.12, ease },
  }),
};

const Index = () => {
  useForceLightTheme();
  const [showSimulator, setShowSimulator] = useState(false);
  const handleSimulate = useCallback(() => setShowSimulator(true), []);
  const handleBack = useCallback(() => setShowSimulator(false), []);

  if (showSimulator) {
    return (
      <Suspense fallback={<SimulatorLoader />}>
        <PoolSimulator onBack={handleBack} />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageSEO
        title="SIMULAPOOL - Simulador de Piscinas de Fibra"
        description="Descubra o preço da sua piscina de fibra em menos de 1 minuto. Simulador gratuito com orçamento detalhado na hora. 100% online."
        path="/"
      />
      {/* ─── Hero Block ─── */}
      <header
        className="relative overflow-hidden"
        style={{
          background:
            "linear-gradient(180deg, #0A1628 0%, #0C1A33 30%, #0D1F3C 50%, #0F2847 65%, #1A3A5C 80%, #3D6B8D 90%, #7AADCB 96%, #FFFFFF 100%)",
          minHeight: "100svh",
          contain: "layout style",
        }}
      >
        <SiteHeader onSimulate={handleSimulate} />

        {/* Background atmosférico — glow + grid sutil */}
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <div
            className="hidden md:block absolute left-1/2 top-[18%] -translate-x-1/2 rounded-full"
            style={{
              width: 1100, height: 1100, opacity: 0.45,
              background: "radial-gradient(closest-side, rgba(14,165,233,0.45), transparent 70%)",
              filter: "blur(40px)",
            }}
          />
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(125,211,252,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(125,211,252,0.9) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
              maskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
              WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
            }}
          />
        </div>

        {/* ─── Hero Content ─── */}
        <div className="relative max-w-[760px] mx-auto text-center z-10 px-5 md:px-4 pt-14 md:pt-24 pb-12 md:pb-36">
          <motion.div
            variants={fadeUp} initial="hidden" animate="visible" custom={0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 md:mb-8"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", backdropFilter: "blur(8px)" }}
          >
            <span className="relative flex w-2 h-2">
              <span className="absolute inset-0 rounded-full bg-[#38BDF8] animate-ping opacity-75"></span>
              <span className="relative w-2 h-2 rounded-full bg-[#38BDF8]"></span>
            </span>
            <span className="text-[11px] md:text-[12px] font-semibold uppercase tracking-[0.12em] text-white/85">
              Orçamento oficial · direto da fábrica
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp} initial="hidden" animate="visible" custom={1}
            className="font-sp-display font-extrabold text-white text-balance mb-5 md:mb-6"
            style={{ fontSize: "clamp(38px, 7vw, 72px)", lineHeight: 1.04, letterSpacing: "-0.025em" }}
          >
            Descubra o{" "}
            <span className="text-[#38BDF8]">preço</span>{" "}
            da sua piscina
            <br className="hidden md:block" />
            {" "}em menos de{" "}
            <span className="relative inline-block">
              1 minuto
              <svg aria-hidden className="absolute left-0 right-0 -bottom-2 w-full" viewBox="0 0 200 8" preserveAspectRatio="none">
                <path d="M2 6 Q 100 0, 198 6" stroke="#38BDF8" strokeWidth="3" fill="none" strokeLinecap="round" />
              </svg>
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp} initial="hidden" animate="visible" custom={2}
            className="text-[15px] md:text-[18px] max-w-[480px] mx-auto mb-10 md:mb-12 leading-relaxed"
            style={{ color: "rgba(255,255,255,0.75)" }}
          >
            Escolha o modelo, personalize do seu jeito e veja o valor na hora — sem precisar falar com vendedor.
          </motion.p>

          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3}>
            <button
              onClick={handleSimulate}
              className="group w-full md:w-auto inline-flex items-center justify-center h-[52px] px-10 text-[16px] font-semibold rounded-xl transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] animate-cta-pulse"
              style={{ backgroundColor: "#FFFFFF", color: "#0A1628" }}
              aria-label="Iniciar simulação de piscina"
            >
              Simular Minha Piscina
              <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </button>
          </motion.div>

          <motion.p
            variants={fadeUp} initial="hidden" animate="visible" custom={4}
            className="mt-5 text-[13px] md:text-[14px] font-medium tracking-wide"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            Sem compromisso · Resultado na hora · 100% online
          </motion.p>
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main>
        <HowItWorks onSimulate={handleSimulate} />
        <PartnersMarquee />

        {/* ─── Final CTA ─── */}
        <section className="py-20 md:py-28 px-4" style={{ background: "linear-gradient(180deg, #FFFFFF 0%, #F0F9FF 100%)" }}>
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-[560px] mx-auto text-center"
          >
            <h2 className="text-[24px] md:text-[32px] font-bold text-foreground mb-3 md:mb-4 tracking-[-0.02em]">
              Sua piscina pode estar pronta
              <br />
              <span className="text-primary">antes do verão</span>
            </h2>
            <p className="text-[15px] text-muted-foreground mb-10 md:mb-12 leading-relaxed max-w-[420px] mx-auto">
              Simule agora, sem compromisso. É grátis e leva menos de 1 minuto.
            </p>

            <button
              onClick={handleSimulate}
              className="group w-full md:w-auto inline-flex items-center justify-center h-12 px-8 text-[15px] font-semibold rounded-xl bg-primary text-primary-foreground transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] mb-6 animate-cta-pulse"
              aria-label="Iniciar simulação de piscina"
            >
              Simular Minha Piscina
              <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </button>

            <p className="text-[13px] text-muted-foreground">
              Sem Compromisso · Sem Burocracia · 100% Gratuito!
            </p>
          </motion.div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default Index;
