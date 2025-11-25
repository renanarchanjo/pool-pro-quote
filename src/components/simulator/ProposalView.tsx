import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileDown, MessageCircle, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PoolModel {
  name: string;
  differentials: string[];
  included_items: string[];
  not_included_items: string[];
  base_price: number;
  delivery_days: number;
  installation_days: number;
}

interface Optional {
  name: string;
  price: number;
}

interface CustomerData {
  name: string;
  city: string;
  whatsapp: string;
}

interface ProposalViewProps {
  model: PoolModel;
  selectedOptionals: Optional[];
  customerData: CustomerData;
  category: string;
  onBack: () => void;
}

const ProposalView = ({ model, selectedOptionals, customerData, category, onBack }: ProposalViewProps) => {
  const optionalsTotal = selectedOptionals.reduce((sum, opt) => sum + opt.price, 0);
  const totalPrice = model.base_price + optionalsTotal;
  const today = new Date().toLocaleDateString('pt-BR');
  const validUntil = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR');

  const generateWhatsAppMessage = () => {
    let message = `🏊‍♂️ *PROPOSTA - PISCINA DE FIBRA*\n\n`;
    message += `📋 *Dados do Cliente:*\n`;
    message += `Nome: ${customerData.name}\n`;
    message += `Cidade: ${customerData.city}\n\n`;
    message += `🏊 *Categoria:* ${category}\n`;
    message += `🎯 *Modelo:* ${model.name}\n\n`;
    
    if (model.differentials.length > 0) {
      message += `✨ *Diferenciais:*\n`;
      model.differentials.forEach(d => message += `• ${d}\n`);
      message += `\n`;
    }
    
    if (model.included_items.length > 0) {
      message += `✅ *Itens Inclusos:*\n`;
      model.included_items.forEach(i => message += `• ${i}\n`);
      message += `\n`;
    }
    
    if (model.not_included_items.length > 0) {
      message += `❌ *Não Inclusos:*\n`;
      model.not_included_items.forEach(i => message += `• ${i}\n`);
      message += `\n`;
    }
    
    if (selectedOptionals.length > 0) {
      message += `➕ *Opcionais Selecionados:*\n`;
      selectedOptionals.forEach(opt => {
        message += `• ${opt.name} - R$ ${opt.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
      });
      message += `\n`;
    }
    
    message += `💰 *VALOR DO INVESTIMENTO:*\n`;
    message += `Base: R$ ${model.base_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
    if (optionalsTotal > 0) {
      message += `Opcionais: R$ ${optionalsTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
    }
    message += `*TOTAL: R$ ${totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*\n\n`;
    
    message += `📅 *Prazos:*\n`;
    message += `Entrega: ${model.delivery_days} dias\n`;
    message += `Instalação: ${model.installation_days} dias\n\n`;
    
    message += `💳 *Forma de Pagamento:* À vista\n`;
    message += `📆 *Data de Emissão:* ${today}\n`;
    message += `⏰ *Validade:* ${validUntil} (3 dias)\n`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/55${customerData.whatsapp.replace(/\D/g, '')}?text=${encoded}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gradient-hero print:bg-white">
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-sm print:hidden">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Button variant="ghost" onClick={onBack}>Voltar ao Início</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
            <Button onClick={generateWhatsAppMessage} className="gradient-primary text-white">
              <MessageCircle className="w-4 h-4 mr-2" />
              Enviar WhatsApp
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto p-8 shadow-card print:shadow-none">
          <div className="text-center mb-8 print:mb-6">
            <h1 className="text-4xl font-bold mb-2 print:text-3xl">Proposta Comercial</h1>
            <p className="text-muted-foreground">Piscina de Fibra</p>
          </div>

          <div className="space-y-6 print:space-y-4">
            <div>
              <h2 className="text-xl font-bold mb-3 print:text-lg">Dados do Cliente</h2>
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="font-semibold">Nome:</span> {customerData.name}
                </div>
                <div>
                  <span className="font-semibold">Cidade:</span> {customerData.city}
                </div>
                <div>
                  <span className="font-semibold">WhatsApp:</span> {customerData.whatsapp}
                </div>
                <div>
                  <span className="font-semibold">Data:</span> {today}
                </div>
              </div>
            </div>

            <div className="border-t pt-6 print:pt-4">
              <h2 className="text-xl font-bold mb-3 print:text-lg">Especificações</h2>
              <div className="space-y-3">
                <div>
                  <span className="font-semibold">Categoria:</span> {category}
                </div>
                <div>
                  <span className="font-semibold">Modelo:</span> {model.name}
                </div>
                
                {model.differentials.length > 0 && (
                  <div>
                    <span className="font-semibold block mb-2">Diferenciais:</span>
                    <div className="flex flex-wrap gap-2">
                      {model.differentials.map((diff, idx) => (
                        <Badge key={idx} variant="secondary" className="print:border print:border-gray-300">
                          {diff}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {model.included_items.length > 0 && (
                  <div>
                    <span className="font-semibold block mb-2">Itens Inclusos:</span>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {model.included_items.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {model.not_included_items.length > 0 && (
                  <div>
                    <span className="font-semibold block mb-2">Não Inclusos:</span>
                    <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                      {model.not_included_items.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {selectedOptionals.length > 0 && (
              <div className="border-t pt-6 print:pt-4">
                <h2 className="text-xl font-bold mb-3 print:text-lg">Opcionais Selecionados</h2>
                <div className="space-y-2">
                  {selectedOptionals.map((opt, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{opt.name}</span>
                      <span className="font-semibold">
                        R$ {opt.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t pt-6 print:pt-4">
              <h2 className="text-xl font-bold mb-3 print:text-lg">Investimento</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Valor Base</span>
                  <span className="font-semibold">
                    R$ {model.base_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {optionalsTotal > 0 && (
                  <div className="flex justify-between">
                    <span>Opcionais</span>
                    <span className="font-semibold">
                      R$ {optionalsTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-2xl font-bold pt-3 border-t print:text-xl">
                  <span>TOTAL</span>
                  <span className="text-primary">
                    R$ {totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t pt-6 print:pt-4">
              <h2 className="text-xl font-bold mb-3 print:text-lg">Condições</h2>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-semibold">Forma de Pagamento:</span> À vista
                </div>
                <div>
                  <span className="font-semibold">Prazo de Entrega:</span> {model.delivery_days} dias
                </div>
                <div>
                  <span className="font-semibold">Prazo de Instalação:</span> {model.installation_days} dias
                </div>
                <div>
                  <span className="font-semibold">Validade da Proposta:</span> {validUntil} (3 dias)
                </div>
              </div>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default ProposalView;
