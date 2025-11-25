import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface Optional {
  id: string;
  name: string;
  description: string;
  price: number;
}

interface OptionalsSelectionProps {
  optionals: Optional[];
  selectedOptionals: string[];
  onConfirm: (selectedIds: string[]) => void;
  onBack: () => void;
}

const OptionalsSelection = ({ optionals, selectedOptionals: initialSelected, onConfirm, onBack }: OptionalsSelectionProps) => {
  const [selected, setSelected] = useState<string[]>(initialSelected);

  const toggleOptional = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const totalPrice = optionals
    .filter(opt => selected.includes(opt.id))
    .reduce((sum, opt) => sum + opt.price, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold mb-2">Opcionais</h2>
          <p className="text-muted-foreground">Personalize sua piscina com opcionais</p>
        </div>
        <Button variant="outline" onClick={onBack}>Voltar</Button>
      </div>

      <div className="space-y-3 mb-6">
        {optionals.map((optional) => (
          <Card
            key={optional.id}
            className={`p-4 cursor-pointer transition-all hover:shadow-card ${
              selected.includes(optional.id) ? "border-2 border-primary" : ""
            }`}
            onClick={() => toggleOptional(optional.id)}
          >
            <div className="flex items-start gap-4">
              <Checkbox
                checked={selected.includes(optional.id)}
                onCheckedChange={() => toggleOptional(optional.id)}
              />
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold">{optional.name}</h4>
                    {optional.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {optional.description}
                      </p>
                    )}
                  </div>
                  <span className="font-semibold text-primary whitespace-nowrap ml-4">
                    + R$ {optional.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="border-t pt-4 flex justify-between items-center">
        <div>
          <p className="text-sm text-muted-foreground">Total em opcionais:</p>
          <p className="text-2xl font-bold text-primary">
            R$ {totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <Button onClick={() => onConfirm(selected)} className="gradient-primary text-white">
          Continuar
        </Button>
      </div>
    </div>
  );
};

export default OptionalsSelection;
