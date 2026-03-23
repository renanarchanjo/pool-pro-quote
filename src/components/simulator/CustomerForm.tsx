import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CustomerData {
  name: string;
  city: string;
  whatsapp: string;
}

interface CustomerFormProps {
  onSubmit: (data: CustomerData) => void;
  onBack: () => void;
  model: any;
  optionals: any[];
}

const STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

const CustomerForm = ({ onSubmit, onBack, model, optionals }: CustomerFormProps) => {
  const [loading, setLoading] = useState(false);
  const [uf, setUf] = useState("");
  const [city, setCity] = useState("");
  const [formData, setFormData] = useState({ name: "", whatsapp: "" });

  const totalPrice = model.base_price + optionals.reduce((sum, opt) => sum + opt.price, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.city || !formData.whatsapp) {
      toast.error("Preencha todos os campos");
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-10 animate-fade-in">
        <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
          Seus Dados
        </h1>
        <p className="text-lg text-muted-foreground">
          Preencha suas informações para receber a proposta
        </p>
      </div>

      <Card className="p-8 bg-card/80 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="name">Nome Completo *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Seu nome"
              required
            />
          </div>

          <div>
            <Label htmlFor="city">Cidade *</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="Sua cidade"
              required
            />
          </div>

          <div>
            <Label htmlFor="whatsapp">WhatsApp *</Label>
            <Input
              id="whatsapp"
              value={formData.whatsapp}
              onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
              placeholder="(00) 00000-0000"
              required
            />
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">Resumo do Orçamento:</p>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-sm">Modelo:</span>
                <span className="text-sm font-semibold">{model.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Opcionais:</span>
                <span className="text-sm font-semibold">{optionals.length} item(ns)</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="font-semibold">Total:</span>
                <span className="text-xl font-bold text-primary">
                  R$ {totalPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full gradient-primary text-white"
            size="lg"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Gerando Proposta...
              </>
            ) : (
              "Gerar Proposta"
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default CustomerForm;
