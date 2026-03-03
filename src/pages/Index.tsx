import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Calculator, FileText, MessageCircle, Sparkles, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import PoolSimulator from "@/components/simulator/PoolSimulator";
import PricingSection from "@/components/landing/PricingSection";
import logoHorizontal from "@/assets/simulapool-horizontal.png";
import heroPattern from "@/assets/hero-pattern.png";

const Index = () => {
  const [showSimulator, setShowSimulator] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (showSimulator) {
    return <PoolSimulator onBack={() => setShowSimulator(false)} />;
  }

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-gradient-hero relative overflow-hidden">
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url(${heroPattern})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      
      <div className="relative z-10">
        {/* Professional Header */}
        <nav className="sticky top-0 z-50 border-b border-border/30 bg-background/95 backdrop-blur-md">
          <div className="container mx-auto px-4 py-3 flex justify-between items-center">
            <img src={logoHorizontal} alt="SIMULAPOOL" className="h-9 object-contain" />
            
            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <button onClick={() => scrollTo("features")} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Funcionalidades
              </button>
              <button onClick={() => scrollTo("pricing")} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Planos
              </button>
              <button onClick={() => setShowSimulator(true)} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Simulador
              </button>
              <Link to="/auth">
                <Button size="sm" className="gradient-primary text-white font-display font-semibold shadow-sm">
                  Área do Lojista
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Toggle */}
            <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Mobile Nav */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-border/30 bg-background/98 backdrop-blur-md px-4 py-4 space-y-3">
              <button onClick={() => scrollTo("features")} className="block w-full text-left text-sm font-medium py-2">Funcionalidades</button>
              <button onClick={() => scrollTo("pricing")} className="block w-full text-left text-sm font-medium py-2">Planos</button>
              <button onClick={() => { setMobileMenuOpen(false); setShowSimulator(true); }} className="block w-full text-left text-sm font-medium py-2">Simulador</button>
              <Link to="/auth" className="block">
                <Button size="sm" className="w-full gradient-primary text-white font-display font-semibold">Área do Lojista</Button>
              </Link>
            </div>
          )}
        </nav>

        <main className="container mx-auto px-4 py-20">
          {/* Hero Section */}
          <div className="max-w-4xl mx-auto text-center mb-20 animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6 animate-wave">
              <Sparkles className="w-4 h-4" />
              Orçamentos completos em menos de 1 minuto
            </div>
            
            <h1 className="text-5xl md:text-7xl font-display font-extrabold mb-6 leading-tight">
              <span className="text-gradient">Simule, gere e envie.</span>
              <br />
              <span className="text-foreground">Sem dor de cabeça.</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-10 font-light max-w-2xl mx-auto">
              Crie orçamentos profissionais de piscinas de fibra com modelo, dimensões, opcionais e valor total — prontos para enviar ao cliente pelo WhatsApp.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                size="lg" 
                className="gradient-primary text-white shadow-pool hover:shadow-glow transition-all text-lg px-8 py-6 font-display font-semibold"
                onClick={() => setShowSimulator(true)}
              >
                Gerar Orçamento Agora
                <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
              <Link to="/auth">
                <Button 
                  size="lg" 
                  variant="outline"
                  className="text-lg px-8 py-6 font-display font-semibold"
                >
                  Acesso Lojista
                </Button>
              </Link>
            </div>

            <p className="mt-6 text-sm text-muted-foreground">
              ✓ Sem cadastro necessário • ✓ 100% gratuito • ✓ Orçamento pronto em segundos
            </p>
          </div>

          {/* Features Grid */}
          <div id="features" className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto scroll-mt-20">
            <div className="bg-card/80 backdrop-blur-sm p-8 rounded-2xl shadow-card hover:shadow-pool transition-all animate-fade-in border border-border/50 group">
              <div className="w-16 h-16 gradient-primary rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-lg">
                <Calculator className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-display font-bold mb-3">Valores Calculados na Hora</h3>
              <p className="text-muted-foreground leading-relaxed">
                Escolha modelo e opcionais. O sistema soma tudo automaticamente e gera o valor final sem erro.
              </p>
            </div>

            <div className="bg-card/80 backdrop-blur-sm p-8 rounded-2xl shadow-card hover:shadow-pool transition-all animate-fade-in border border-border/50 group" style={{ animationDelay: "0.1s" }}>
              <div className="w-16 h-16 gradient-primary rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-lg">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-display font-bold mb-3">Orçamento Completo em PDF</h3>
              <p className="text-muted-foreground leading-relaxed">
                Modelo, dimensões, itens inclusos, opcionais selecionados e valor total. Baixe ou imprima na hora.
              </p>
            </div>

            <div className="bg-card/80 backdrop-blur-sm p-8 rounded-2xl shadow-card hover:shadow-pool transition-all animate-fade-in border border-border/50 group" style={{ animationDelay: "0.2s" }}>
              <div className="w-16 h-16 gradient-primary rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-lg">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-display font-bold mb-3">Pronto para WhatsApp</h3>
              <p className="text-muted-foreground leading-relaxed">
                Orçamento formatado e pronto para copiar. Envie direto para o cliente e feche a venda mais rápido.
              </p>
            </div>
          </div>

          {/* Pricing Section */}
          <div id="pricing" className="scroll-mt-20">
            <PricingSection />
          </div>

          {/* CTA Section */}
          <div className="mt-20 text-center">
            <div className="inline-block bg-card/80 backdrop-blur-sm p-10 rounded-3xl shadow-elegant border border-border/50">
              <h2 className="text-3xl font-display font-bold mb-4">
                Pare de perder tempo fazendo orçamentos na mão
              </h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Em poucos cliques você gera um orçamento profissional completo, sem planilha, sem complicação
              </p>
              <Button 
                size="lg"
                className="gradient-tech text-white shadow-pool text-lg px-10 py-6 font-display font-bold"
                onClick={() => setShowSimulator(true)}
              >
                Criar Meu Orçamento Grátis
              </Button>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-border/30 mt-20 py-8 bg-background/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
            <p className="font-display">
              <strong className="text-foreground">SIMULAPOOL</strong> — Orçamentos de piscinas de fibra em segundos
            </p>
            <p className="mt-2">© 2025 SIMULAPOOL. Todos os direitos reservados.</p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Index;
