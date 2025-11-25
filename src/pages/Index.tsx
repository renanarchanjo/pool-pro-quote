import { useState } from "react";
import { Link } from "react-router-dom";
import { Waves, ChevronRight, Calculator, FileText, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import PoolSimulator from "@/components/simulator/PoolSimulator";

const Index = () => {
  const [showSimulator, setShowSimulator] = useState(false);

  if (showSimulator) {
    return <PoolSimulator onBack={() => setShowSimulator(false)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Waves className="w-8 h-8 text-primary" />
            <span className="text-xl font-bold">Simulador Piscinas</span>
          </div>
          <Link to="/auth">
            <Button variant="outline" size="sm">Admin</Button>
          </Link>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center mb-16 animate-fade-in">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
            Sua Piscina dos Sonhos
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Configure sua piscina de fibra ideal em minutos. Escolha o modelo, adicione opcionais e receba uma proposta completa instantaneamente.
          </p>
          <Button 
            size="lg" 
            className="gradient-primary text-white shadow-elegant hover:shadow-lg transition-all"
            onClick={() => setShowSimulator(true)}
          >
            Iniciar Simulação
            <ChevronRight className="ml-2 w-5 h-5" />
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-card p-8 rounded-xl shadow-card hover:shadow-elegant transition-shadow animate-fade-in">
            <div className="w-14 h-14 gradient-primary rounded-lg flex items-center justify-center mb-4">
              <Calculator className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Cálculo Automático</h3>
            <p className="text-muted-foreground">
              Todos os valores são calculados automaticamente com base nos opcionais escolhidos
            </p>
          </div>

          <div className="bg-card p-8 rounded-xl shadow-card hover:shadow-elegant transition-shadow animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <div className="w-14 h-14 gradient-primary rounded-lg flex items-center justify-center mb-4">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Proposta em PDF</h3>
            <p className="text-muted-foreground">
              Gere e baixe propostas profissionais em PDF com todos os detalhes
            </p>
          </div>

          <div className="bg-card p-8 rounded-xl shadow-card hover:shadow-elegant transition-shadow animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <div className="w-14 h-14 gradient-primary rounded-lg flex items-center justify-center mb-4">
              <MessageCircle className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Envio via WhatsApp</h3>
            <p className="text-muted-foreground">
              Mensagem pronta para enviar direto para seus clientes pelo WhatsApp
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
