import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Calculator, FileText, MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import PoolSimulator from "@/components/simulator/PoolSimulator";
import logoHorizontal from "@/assets/simulapool-horizontal.png";
import heroPattern from "@/assets/hero-pattern.png";

const Index = () => {
  const [showSimulator, setShowSimulator] = useState(false);

  if (showSimulator) {
    return <PoolSimulator onBack={() => setShowSimulator(false)} />;
  }

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
        <nav className="border-b border-border/30 bg-background/95 backdrop-blur-md">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <img src={logoHorizontal} alt="SIMULAPOOL" className="h-10 object-contain" />
            <Link to="/auth">
              <Button variant="outline" size="sm" className="shadow-sm">
                Área do Lojista
              </Button>
            </Link>
          </div>
        </nav>

        <main className="container mx-auto px-4 py-20">
          {/* Hero Section */}
          <div className="max-w-4xl mx-auto text-center mb-20 animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6 animate-wave">
              <Sparkles className="w-4 h-4" />
              O jeito moderno de orçar piscinas
            </div>
            
            <h1 className="text-5xl md:text-7xl font-display font-extrabold mb-6 leading-tight">
              <span className="text-gradient">Simulou, orçou.</span>
              <br />
              <span className="text-foreground">Fechou.</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-10 font-light max-w-2xl mx-auto">
              Sistema profissional de orçamentos automatizados para piscinas de fibra. 
              Simples, rápido e tecnológico.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                size="lg" 
                className="gradient-primary text-white shadow-pool hover:shadow-glow transition-all text-lg px-8 py-6 font-display font-semibold"
                onClick={() => setShowSimulator(true)}
              >
                Simular Agora
                <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
              <Link to="/auth">
                <Button 
                  size="lg" 
                  variant="outline"
                  className="text-lg px-8 py-6 font-display font-semibold"
                >
                  Sou Lojista
                </Button>
              </Link>
            </div>

            <p className="mt-6 text-sm text-muted-foreground">
              ✓ Sem cadastro • ✓ 100% grátis • ✓ Proposta em segundos
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-card/80 backdrop-blur-sm p-8 rounded-2xl shadow-card hover:shadow-pool transition-all animate-fade-in border border-border/50 group">
              <div className="w-16 h-16 gradient-primary rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-lg">
                <Calculator className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-display font-bold mb-3">Cálculo Automático</h3>
              <p className="text-muted-foreground leading-relaxed">
                Todos os valores calculados em tempo real com base nos opcionais escolhidos. Zero erros.
              </p>
            </div>

            <div className="bg-card/80 backdrop-blur-sm p-8 rounded-2xl shadow-card hover:shadow-pool transition-all animate-fade-in border border-border/50 group" style={{ animationDelay: "0.1s" }}>
              <div className="w-16 h-16 gradient-primary rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-lg">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-display font-bold mb-3">Proposta Premium</h3>
              <p className="text-muted-foreground leading-relaxed">
                Propostas profissionais com sua marca. Imprima, baixe em PDF ou compartilhe.
              </p>
            </div>

            <div className="bg-card/80 backdrop-blur-sm p-8 rounded-2xl shadow-card hover:shadow-pool transition-all animate-fade-in border border-border/50 group" style={{ animationDelay: "0.2s" }}>
              <div className="w-16 h-16 gradient-primary rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-lg">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-display font-bold mb-3">Envio Instantâneo</h3>
              <p className="text-muted-foreground leading-relaxed">
                Mensagem formatada e pronta para enviar direto no WhatsApp do cliente.
              </p>
            </div>
          </div>

          {/* CTA Section */}
          <div className="mt-20 text-center">
            <div className="inline-block bg-card/80 backdrop-blur-sm p-10 rounded-3xl shadow-elegant border border-border/50">
              <h2 className="text-3xl font-display font-bold mb-4">
                Pronto para modernizar seus orçamentos?
              </h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Junte-se aos lojistas que já usam tecnologia para vender mais
              </p>
              <Button 
                size="lg"
                className="gradient-tech text-white shadow-pool text-lg px-10 py-6 font-display font-bold"
                onClick={() => setShowSimulator(true)}
              >
                Experimentar Grátis
              </Button>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-border/30 mt-20 py-8 bg-background/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
            <p className="font-display">
              <strong className="text-foreground">SIMULAPOOL</strong> - Sistema profissional de orçamentos para piscinas
            </p>
            <p className="mt-2">© 2025 SIMULAPOOL. Todos os direitos reservados.</p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Index;
