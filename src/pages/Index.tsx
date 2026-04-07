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

      {/* Animated water waves */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <svg className="absolute bottom-0 left-0 w-[200%] h-[40%] animate-water-wave-1" viewBox="0 0 1440 320" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path fill="hsl(199 80% 85% / 0.15)" d="M0,224L48,213.3C96,203,192,181,288,186.7C384,192,480,224,576,229.3C672,235,768,213,864,197.3C960,181,1056,171,1152,181.3C1248,192,1344,224,1392,240L1440,256L1440,320L0,320Z"/>
        </svg>
        <svg className="absolute bottom-0 left-0 w-[200%] h-[35%] animate-water-wave-2" viewBox="0 0 1440 320" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path fill="hsl(199 70% 80% / 0.12)" d="M0,288L48,272C96,256,192,224,288,208C384,192,480,192,576,202.7C672,213,768,235,864,240C960,245,1056,235,1152,218.7C1248,203,1344,181,1392,170.7L1440,160L1440,320L0,320Z"/>
        </svg>
        <svg className="absolute bottom-0 left-0 w-[200%] h-[30%] animate-water-wave-3" viewBox="0 0 1440 320" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path fill="hsl(199 90% 88% / 0.18)" d="M0,256L48,240C96,224,192,192,288,197.3C384,203,480,245,576,261.3C672,277,768,267,864,245.3C960,224,1056,192,1152,186.7C1248,181,1344,203,1392,213.3L1440,224L1440,320L0,320Z"/>
        </svg>
        {/* Caustic light ripples */}
        <div className="absolute inset-0 animate-caustics opacity-[0.07]" style={{
          backgroundImage: `
            radial-gradient(ellipse 60px 60px at 20% 30%, hsl(199 100% 70%) 0%, transparent 70%),
            radial-gradient(ellipse 80px 40px at 50% 50%, hsl(199 90% 75%) 0%, transparent 70%),
            radial-gradient(ellipse 50px 70px at 75% 25%, hsl(199 100% 80%) 0%, transparent 70%),
            radial-gradient(ellipse 70px 50px at 35% 70%, hsl(199 85% 72%) 0%, transparent 70%),
            radial-gradient(ellipse 90px 45px at 85% 65%, hsl(199 95% 78%) 0%, transparent 70%),
            radial-gradient(ellipse 55px 65px at 10% 80%, hsl(199 80% 76%) 0%, transparent 70%)
          `
        }} />
      </div>
      
      
      <div className="relative z-10 flex flex-col flex-1">
        <SiteHeader />

        <main className="flex-1 container mx-auto px-4 py-8 md:py-16">
          <div className="max-w-3xl mx-auto text-center flex flex-col items-center justify-center min-h-[60vh]">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium mb-4 md:mb-6 animate-wave">
              <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4" />
              Orçamento completo em menos de 1 minuto
            </div>
            
            <h1 className="text-3xl md:text-5xl lg:text-7xl font-display font-extrabold mb-4 md:mb-6 leading-tight">
              {["Sua", "piscina", "dos", "sonhos"].map((word, i) => (
                <span
                  key={word}
                  className="inline-block animate-hero-word text-gradient opacity-0 mr-[0.25em]"
                  style={{ animationDelay: `${i * 0.12}s` }}
                >
                  {word}
                </span>
              ))}
              <br />
              {["começa", "aqui."].map((word, i) => (
                <span
                  key={word}
                  className="inline-block animate-hero-word text-blue-950 opacity-0 mr-[0.25em]"
                  style={{ animationDelay: `${(i + 4) * 0.12}s` }}
                >
                  {word}
                </span>
              ))}
            </h1>
            
            <p className="text-base md:text-xl lg:text-2xl text-muted-foreground mb-6 md:mb-10 font-light max-w-2xl mx-auto px-2">
              Escolha o modelo, personalize com opcionais e receba seu orçamento completo na hora — pronto para fechar negócio.
            </p>
            
            <Button
              size="lg"
              className="bg-[hsl(210,90%,28%)] hover:bg-[hsl(210,90%,22%)] text-white shadow-pool hover:shadow-glow transition-all text-lg md:text-xl px-9 py-7 md:px-12 md:py-8 font-display font-extrabold w-full sm:w-auto touch-manipulation"
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
                title: "Zero Conta de Cabeça",
                description: "Modelo + opcionais + mão de obra. O sistema faz a matemática por você e entrega o valor exato, sem surpresas.",
              },
              {
                icon: FileText,
                title: "PDF Pronto pra Impressionar",
                description: "Seu cliente recebe um orçamento com cara de empresa grande: organizado, detalhado e pronto pra assinar.",
              },
              {
                icon: MessageCircle,
                title: "Do Orçamento ao Zap em 1 Clique",
                description: "Gerou? Enviou. O orçamento sai formatado direto pro WhatsApp do cliente, sem copiar e colar nada.",
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