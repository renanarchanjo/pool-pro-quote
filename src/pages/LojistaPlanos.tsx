import LojistaHeader from "@/components/landing/LojistaHeader";
import SiteFooter from "@/components/landing/SiteFooter";
import PricingSection from "@/components/landing/PricingSection";
import { useForceLightTheme } from "@/hooks/useForceLightTheme";
import PageSEO from "@/components/PageSEO";

const LojistaPlanos = () => {
  useForceLightTheme();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0B1929" }}>
      <PageSEO
        title="Planos e Preços - SIMULAPOOL para Lojistas"
        description="Escolha o plano ideal para sua loja de piscinas. Orçamentos automáticos, gestão de leads e equipe a partir de R$0."
        path="/lojista/planos"
      />
      <div
        className="relative"
        style={{
          background:
            "linear-gradient(180deg, #0A1628 0%, #0B1929 100%)",
        }}
      >
        <LojistaHeader />
        <div className="h-8 md:h-12" />
      </div>

      <PricingSection hideLeadPlans hideFinalCta />

      <div style={{ background: "#0B1929" }}>
        <SiteFooter />
      </div>
    </div>
  );
};

export default LojistaPlanos;
