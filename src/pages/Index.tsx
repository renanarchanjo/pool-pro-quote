import { lazy, Suspense, useState } from "react";
import { Loader2, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import SiteHeader from "@/components/landing/SiteHeader";
import SiteFooter from "@/components/landing/SiteFooter";
import HowItWorks from "@/components/landing/HowItWorks";
import PartnersMarquee from "@/components/landing/PartnersMarquee";
import { useForceLightTheme } from "@/hooks/useForceLightTheme";

const PoolSimulator = lazy(() => import("@/components/simulator/PoolSimulator"));

const SimulatorLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
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

  if (showSimulator) {
    return (
      <Suspense fallback={<SimulatorLoader />}>
        <PoolSimulator onBack={() => setShowSimulator(false)} />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ─── Unified Navbar + Hero Block ─── */}
      <div
        className="hero-gradient relative overflow-hidden"
        style={{
          background:
            "linear-gradient(180deg, #0A1628 0%, #0C1A33 25%, #0D1F3C 42%, #0F2847 55%, #1A3A5C 68%, #3D6B8D 78%, #7AADCB 88%, #C5E2F0 96%, #FFFFFF 100%)",
        }}
      >
        <SiteHeader onSimulate={() => setShowSimulator(true)} />

        {/* Subtle blobs — desktop only */}
        <div
          className="hidden md:block absolute pointer-events-none rounded-full"
          style={{
            width: 500, height: 500, top: -80, left: -120,
            background: "radial-gradient(circle, rgba(14,165,233,0.15) 0%, transparent 70%)",
          }}
        />
        <div
          className="hidden md:block absolute pointer-events-none rounded-full"
          style={{
            width: 400, height: 400, bottom: 60, right: -80,
            background: "radial-gradient(circle, rgba(56,189,248,0.1) 0%, transparent 70%)",
          }}
        />

        {/* ─── Hero Content ─── */}
        <div className="relative max-w-[720px] mx-auto text-center z-10 px-5 md:px-4 pt-12 pb-20 md:pt-24 md:pb-36">
          <motion.p
            variants={fadeUp} initial="hidden" animate="visible" custom={0}
            className="text-[12px] md:text-[13px] font-medium tracking-[0.08em] uppercase mb-5 md:mb-6"
            style={{ color: "rgba(125,211,252,0.55)" }}
          >
            Mais de 4.800 simulações reais por mês
          </motion.p>

          {/* Headline — biggest element, clear hierarchy */}
          <motion.h1
            variants={fadeUp} initial="hidden" animate="visible" custom={1}
            className="text-[36px] leading-[1.1] md:text-[56px] md:leading-[1.08] font-bold text-white tracking-[-0.025em] mb-5 md:mb-6"
          >
            Descubra o{" "}
            <span className="text-[#38BDF8]">preço</span>{" "}
            da sua piscina
            <br className="hidden md:block" />
            {" "}em menos de 1 minuto
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            variants={fadeUp} initial="hidden" animate="visible" custom={2}
            className="text-[15px] md:text-[18px] max-w-[480px] mx-auto mb-10 md:mb-12 leading-relaxed"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            Escolha o modelo, personalize do seu jeito e veja o valor na hora — sem precisar falar com vendedor.
          </motion.p>

          {/* CTA — heavy, prominent */}
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3}>
            <button
              onClick={() => setShowSimulator(true)}
              className="group w-full md:w-auto inline-flex items-center justify-center h-[52px] px-10 text-[16px] font-semibold rounded-xl transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] animate-cta-pulse"
              style={{
                backgroundColor: "#FFFFFF",
                color: "#0A1628",
              }}
            >
              Simular Minha Piscina
              <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </motion.div>

          {/* Trust line */}
          <motion.p
            variants={fadeUp} initial="hidden" animate="visible" custom={4}
            className="mt-5 text-[13px] md:text-[14px] font-medium tracking-wide"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            Sem compromisso · Resultado na hora · 100% online
          </motion.p>
        </div>
      </div>

      {/* ─── How It Works ─── */}
      <HowItWorks onSimulate={() => setShowSimulator(true)} />

      {/* ─── Partners Marquee ─── */}
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
            onClick={() => setShowSimulator(true)}
            className="group w-full md:w-auto inline-flex items-center justify-center h-12 px-8 text-[15px] font-semibold rounded-xl bg-primary text-primary-foreground transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] mb-6 animate-cta-pulse"
          >
            Simular Minha Piscina
            <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </button>

          <p className="text-[13px] text-muted-foreground">
            Sem cadastro · Sem compromisso · 100% gratuito
          </p>
        </motion.div>
      </section>

      <SiteFooter />
    </div>
  );
};

export default Index;
