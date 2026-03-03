import SiteHeader from "@/components/landing/SiteHeader";
import SiteFooter from "@/components/landing/SiteFooter";

const partners = [
  {
    name: "Splash",
    logo: "https://logo.clearbit.com/splash.com",
  },
  {
    name: "iGUi",
    logo: "https://www.igui.com.br/wp-content/themes/flavor/assets/images/logo.png",
  },
  {
    name: "Rio Piscinas",
    logo: "https://logo.clearbit.com/riopiscinas.com.br",
  },
  {
    name: "Up Piscinas",
    logo: "https://logo.clearbit.com/uppiscinas.com.br",
  },
];

const Parceiros = () => {
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
          {partners.map((partner) => (
            <div
              key={partner.name}
              className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 hover:shadow-pool transition-all"
            >
              <div className="w-24 h-24 flex items-center justify-center">
                <img
                  src={partner.logo}
                  alt={partner.name}
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.parentElement!.innerHTML = `<span class="text-2xl font-display font-bold text-primary">${partner.name}</span>`;
                  }}
                />
              </div>
              <p className="text-sm font-semibold text-muted-foreground">{partner.name}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-16">
          <p className="text-muted-foreground">
            Quer ser um parceiro SIMULAPOOL?{" "}
            <a href="mailto:contato@simulapool.com.br" className="text-primary hover:underline font-semibold">
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
