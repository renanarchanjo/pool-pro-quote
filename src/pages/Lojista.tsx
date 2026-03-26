import LojistaHeader from "@/components/landing/LojistaHeader";
import SiteFooter from "@/components/landing/SiteFooter";
import PricingSection from "@/components/landing/PricingSection";
import { useForceLightTheme } from "@/hooks/useForceLightTheme";

const Lojista = () => {
  useForceLightTheme();
  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col">
      <LojistaHeader />
      <main className="flex-1 container mx-auto px-4">
        <PricingSection />
      </main>
      <SiteFooter />
    </div>
  );
};

export default Lojista;
