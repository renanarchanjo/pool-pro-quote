import SiteHeader from "@/components/landing/SiteHeader";
import SiteFooter from "@/components/landing/SiteFooter";
import PricingSection from "@/components/landing/PricingSection";
import { useForceLightTheme } from "@/hooks/useForceLightTheme";

const Precos = () => {
  useForceLightTheme();
  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col">
      <SiteHeader />
      <main className="flex-1 container mx-auto px-4">
        <PricingSection />
      </main>
      <SiteFooter />
    </div>
  );
};

export default Precos;
