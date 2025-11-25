import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";

interface PoolModel {
  id: string;
  name: string;
  differentials: string[];
  included_items: string[];
  not_included_items: string[];
  base_price: number;
  delivery_days: number;
  installation_days: number;
}

interface ModelSelectionProps {
  models: PoolModel[];
  onSelect: (model: PoolModel) => void;
  onBack: () => void;
}

const ModelSelection = ({ models, onSelect, onBack }: ModelSelectionProps) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold mb-2">Escolha o Modelo</h2>
          <p className="text-muted-foreground">Selecione o modelo perfeito para seu projeto</p>
        </div>
        <Button variant="outline" onClick={onBack}>Voltar</Button>
      </div>
      
      <div className="space-y-4">
        {models.map((model) => (
          <Card key={model.id} className="p-6 hover:shadow-elegant transition-all">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-2xl font-bold mb-2">{model.name}</h3>
                <p className="text-3xl font-bold text-primary">
                  R$ {model.base_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <Button onClick={() => onSelect(model)} className="gradient-primary text-white">
                Selecionar
              </Button>
            </div>

            {model.differentials.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold mb-2">Diferenciais:</h4>
                <div className="flex flex-wrap gap-2">
                  {model.differentials.map((diff, idx) => (
                    <Badge key={idx} variant="secondary">{diff}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              {model.included_items.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    Inclusos:
                  </h4>
                  <ul className="space-y-1 text-sm">
                    {model.included_items.map((item, idx) => (
                      <li key={idx} className="text-muted-foreground">• {item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {model.not_included_items.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <X className="w-4 h-4 text-destructive" />
                    Não inclusos:
                  </h4>
                  <ul className="space-y-1 text-sm">
                    {model.not_included_items.map((item, idx) => (
                      <li key={idx} className="text-muted-foreground">• {item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t flex gap-4 text-sm text-muted-foreground">
              <span>Entrega: {model.delivery_days} dias</span>
              <span>Instalação: {model.installation_days} dias</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ModelSelection;
