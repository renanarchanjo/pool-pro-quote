import LojistaHeader from "@/components/landing/LojistaHeader";
import SiteFooter from "@/components/landing/SiteFooter";
import PricingSection from "@/components/landing/PricingSection";
import { useForceLightTheme } from "@/hooks/useForceLightTheme";

const LojistaPlanos = () => {
  useForceLightTheme();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0B1929" }}>
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

      <div className="bg-background">
        <SiteFooter />
      </div>
    </div>
  );
};

export default LojistaPlanos;
