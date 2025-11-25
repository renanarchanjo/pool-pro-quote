import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface CustomerData {
  name: string;
  city: string;
  whatsapp: string;
}

interface CustomerFormProps {
  onSubmit: (data: CustomerData) => void;
  onBack: () => void;
}

const CustomerForm = ({ onSubmit, onBack }: CustomerFormProps) => {
  const [formData, setFormData] = useState<CustomerData>({
    name: "",
    city: "",
    whatsapp: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.city || !formData.whatsapp) {
      toast.error("Preencha todos os campos");
      return;
    }

    if (!/^\d{10,11}$/.test(formData.whatsapp.replace(/\D/g, ""))) {
      toast.error("WhatsApp inválido. Use apenas números com DDD");
      return;
    }

    onSubmit(formData);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold mb-2">Seus Dados</h2>
          <p className="text-muted-foreground">Precisamos de algumas informações para gerar sua proposta</p>
        </div>
        <Button variant="outline" onClick={onBack}>Voltar</Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="name">Nome Completo *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Seu nome"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="city">Cidade *</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            placeholder="Sua cidade"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="whatsapp">WhatsApp (com DDD) *</Label>
          <Input
            id="whatsapp"
            value={formData.whatsapp}
            onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
            placeholder="11999999999"
            className="mt-1"
          />
        </div>

        <Button type="submit" className="w-full gradient-primary text-white">
          Gerar Proposta
        </Button>
      </form>
    </div>
  );
};

export default CustomerForm;
