import LojistaHeader from "@/components/landing/LojistaHeader";
import SiteFooter from "@/components/landing/SiteFooter";
import PricingSection from "@/components/landing/PricingSection";
import { useForceLightTheme } from "@/hooks/useForceLightTheme";

const LojistaPlanos = () => {
  useForceLightTheme();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div
        className="relative"
        style={{
          background:
            "linear-gradient(180deg, #0A1628 0%, #0C1A33 40%, #1A3A5C 70%, #7AADCB 88%, #FFFFFF 100%)",
        }}
      >
        <LojistaHeader />
        <div className="h-16 md:h-24" />
      </div>

      <section className="px-4 bg-background -mt-4">
        <div className="container mx-auto">
          <PricingSection hideLeadPlans hideFinalCta />
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};

export default LojistaPlanos;
