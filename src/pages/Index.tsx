import { lazy, Suspense, useState } from "react";
import { ChevronRight, Layers, Briefcase, TrendingUp, Calculator, FileText, MessageCircle, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import SiteHeader from "@/components/landing/SiteHeader";
import SiteFooter from "@/components/landing/SiteFooter";
import heroPattern from "@/assets/hero-pattern.png";
import { useForceLightTheme } from "@/hooks/useForceLightTheme";

const PoolSimulator = lazy(() => import("@/components/simulator/PoolSimulator"));

const SimulatorLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

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
    <div className="min-h-screen bg-gradient-hero relative overflow-hidden flex flex-col">
      <div
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage: `url(${heroPattern})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }} />
      
      
      <div className="relative z-10 flex flex-col flex-1">
        <SiteHeader />

        <main className="flex-1 flex items-center justify-center container mx-auto px-4 py-8 md:py-16">
          <div className="max-w-3xl mx-auto text-center animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium mb-4 md:mb-6 animate-wave">
              <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4" />
              Orçamento completo em menos de 1 minuto
            </div>
            
            <h1 className="text-3xl md:text-5xl lg:text-7xl font-display font-extrabold mb-4 md:mb-6 leading-tight">
              <span className="text-gradient">Sua piscina dos sonhos</span>
              <br />
              <span className="text-blue-950">começa aqui.</span>
            </h1>
            
            <p className="text-base md:text-xl lg:text-2xl text-muted-foreground mb-6 md:mb-10 font-light max-w-2xl mx-auto px-2">
              Escolha o modelo, personalize com opcionais e receba seu orçamento completo na hora — pronto para fechar negócio.
            </p>
            
            <Button
              size="lg"
              className="gradient-primary text-white shadow-pool hover:shadow-glow transition-all text-base md:text-lg px-8 py-6 md:px-10 md:py-7 font-display font-semibold w-full sm:w-auto touch-manipulation"
              onClick={() => setShowSimulator(true)}>
              
              Simular Minha Piscina
              <ChevronRight className="ml-2 w-5 h-5" />
            </Button>

            <p className="mt-4 md:mt-6 text-xs md:text-sm text-muted-foreground">
               • ✓ 100% gratuito • ✓ Orçamento pronto em segundos
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mt-12 md:mt-20 max-w-5xl mx-auto w-full">
            {[
              {
                icon: Layers,
                title: "Opcionais Flexíveis",
                description: "Iluminação, aquecimento, cascata, hidromassagem e muito mais, tudo organizado por categoria.",
              },
              {
                icon: Briefcase,
                title: "Pensado para Lojistas",
                description: "Ferramenta criada para facilitar o atendimento e aumentar a conversão de vendas.",
              },
              {
                icon: TrendingUp,
                title: "Mais Conversão e Agilidade",
                description: "Atenda mais rápido, responda na hora e aumente suas chances de fechar a venda com propostas claras e profissionais.",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="bg-card/80 backdrop-blur-sm rounded-2xl p-6 text-left shadow-sm border border-border/30"
              >
                <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-4">
                  <card.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-display font-bold text-foreground text-lg mb-2">{card.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{card.description}</p>
              </div>
            ))}
          </div>

          {/* Second Row of Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mt-4 md:mt-6 max-w-5xl mx-auto w-full">
            {[
              {
                icon: Calculator,
                title: "Valores Calculados na Hora",
                description: "Escolha modelo e opcionais. O sistema soma tudo automaticamente e gera o valor final sem erro.",
              },
              {
                icon: FileText,
                title: "Orçamento Completo em PDF",
                description: "Modelo, dimensões, itens inclusos, opcionais selecionados e valor total. Baixe ou imprima na hora.",
              },
              {
                icon: MessageCircle,
                title: "Pronto para WhatsApp",
                description: "Orçamento formatado e pronto para envio direto ao cliente pelo WhatsApp.",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="bg-card/80 backdrop-blur-sm rounded-2xl p-6 text-left shadow-sm border border-border/30"
              >
                <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-4">
                  <card.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-display font-bold text-foreground text-lg mb-2">{card.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{card.description}</p>
              </div>
            ))}
          </div>
        </main>

        <SiteFooter />
      </div>
    </div>);

};

export default Index;