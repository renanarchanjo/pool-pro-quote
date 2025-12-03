import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PoolModel {
  id: string;
  name: string;
  length: number | null;
  width: number | null;
  depth: number | null;
  photo_url: string | null;
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
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {models.map((model) => (
          <Card key={model.id} className="overflow-hidden hover:shadow-elegant transition-all cursor-pointer group" onClick={() => onSelect(model)}>
            {model.photo_url && (
              <div className="aspect-square overflow-hidden bg-white p-4">
                <img 
                  src={model.photo_url} 
                  alt={model.name}
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            )}
            <div className="p-4">
              <h3 className="text-xl font-bold mb-1">{model.name}</h3>
              {(model.length || model.width || model.depth) && (
                <p className="text-sm text-muted-foreground mb-2">
                  {model.length}m x {model.width}m x {model.depth}m
                </p>
              )}

              {model.differentials.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {model.differentials.slice(0, 2).map((diff, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">{diff}</Badge>
                  ))}
                </div>
              )}

              <div className="flex gap-3 text-xs text-muted-foreground">
                <span>Entrega: {model.delivery_days} dias</span>
                <span>Instalação: {model.installation_days} dias</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ModelSelection;
