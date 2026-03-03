import { useState } from "react";
import { ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import PoolSimulator from "@/components/simulator/PoolSimulator";
import SiteHeader from "@/components/landing/SiteHeader";
import SiteFooter from "@/components/landing/SiteFooter";
import heroPattern from "@/assets/hero-pattern.png";

const Index = () => {
  const [showSimulator, setShowSimulator] = useState(false);

  if (showSimulator) {
    return <PoolSimulator onBack={() => setShowSimulator(false)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-hero relative overflow-hidden flex flex-col">
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url(${heroPattern})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      
      <div className="relative z-10 flex flex-col flex-1">
        <SiteHeader />

        <main className="flex-1 flex items-center justify-center container mx-auto px-4 py-16">
          <div className="max-w-3xl mx-auto text-center animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6 animate-wave">
              <Sparkles className="w-4 h-4" />
              Orçamento completo em menos de 1 minuto
            </div>
            
            <h1 className="text-5xl md:text-7xl font-display font-extrabold mb-6 leading-tight">
              <span className="text-gradient">Sua piscina dos sonhos</span>
              <br />
              <span className="text-foreground">começa aqui.</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-10 font-light max-w-2xl mx-auto">
              Escolha o modelo, personalize com opcionais e receba seu orçamento completo na hora — pronto para fechar negócio.
            </p>
            
            <Button 
              size="lg" 
              className="gradient-primary text-white shadow-pool hover:shadow-glow transition-all text-lg px-10 py-7 font-display font-semibold"
              onClick={() => setShowSimulator(true)}
            >
              Simular Minha Piscina
              <ChevronRight className="ml-2 w-5 h-5" />
            </Button>

            <p className="mt-6 text-sm text-muted-foreground">
              ✓ Sem cadastro • ✓ 100% gratuito • ✓ Orçamento pronto em segundos
            </p>
          </div>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
};

export default Index;
