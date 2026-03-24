import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SiteHeader from "@/components/landing/SiteHeader";
import SiteFooter from "@/components/landing/SiteFooter";

interface Partner {
  id: string;
  name: string;
  logo_url: string | null;
}

const Parceiros = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPartners = async () => {
      const { data } = await supabase
        .from("partners")
        .select("id, name, logo_url")
        .eq("active", true)
        .order("display_order", { ascending: true });

      setPartners(data || []);
      setLoading(false);
    };
    fetchPartners();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col">
      <SiteHeader />
      <main className="flex-1 container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-display font-extrabold mb-4">
            Nossos Parceiros
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Trabalhamos com as maiores marcas do mercado de piscinas do Brasil
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : partners.length === 0 ? (
          <p className="text-center text-muted-foreground py-20">
            Em breve nossos parceiros estarão aqui.
          </p>
        ) : (
          <div className="flex flex-wrap justify-center gap-8 max-w-4xl mx-auto">
            {partners.map((partner) => (
              <div
                key={partner.id}
                className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 hover:shadow-pool transition-all"
              >
                <div className="w-28 h-28 flex items-center justify-center">
                  {partner.logo_url ? (
                    <img
                      src={partner.logo_url}
                      alt={partner.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <span className="text-2xl font-display font-bold text-primary">
                      {partner.name}
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-muted-foreground">{partner.name}</p>
              </div>
            ))}
          </div>
        )}

        <div className="text-center mt-16">
          <p className="text-muted-foreground">
            Quer ser um parceiro SIMULAPOOL?{" "}
            <a href="mailto:simulapool@gmail.com" className="text-primary hover:underline font-semibold">
              Entre em contato
            </a>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default Parceiros;
