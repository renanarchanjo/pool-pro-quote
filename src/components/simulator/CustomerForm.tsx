import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import BlurredPrice from "./BlurredPrice";
import { useGeolocation, STATES_LIST } from "@/hooks/useGeolocation";

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
  includedItemsTotal?: number;
  hidePricing?: boolean;
}

const CustomerForm = ({ onSubmit, onBack, model, optionals, includedItemsTotal = 0, hidePricing = false }: CustomerFormProps) => {
  const [loading, setLoading] = useState(false);
  const [uf, setUf] = useState("");
  const [city, setCity] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [formData, setFormData] = useState({ name: "", whatsapp: "" });
  const { detectLocation, loading: geoLoading } = useGeolocation();

  // Auto-detect location on mount
  useEffect(() => {
    const autoDetect = async () => {
      const loc = await detectLocation();
      if (loc) {
        setUf(loc.state);
        setCity(loc.city);
        toast.success(`Localização detectada: ${loc.city} / ${loc.state}`);
      }
    };
    autoDetect();
  }, []);

  // Fetch cities when UF changes
  useEffect(() => {
    if (!uf) { setCities([]); return; }
    const fetchCities = async () => {
      setLoadingCities(true);
      try {
        const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`);
        const data = await res.json();
        setCities(data.map((m: any) => m.nome));
      } catch { setCities([]); }
      finally { setLoadingCities(false); }
    };
    fetchCities();
  }, [uf]);

  const totalPrice = model.base_price + includedItemsTotal + optionals.reduce((sum: number, opt: any) => sum + opt.price, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !city || !uf || !formData.whatsapp) {
      toast.error("Preencha todos os campos");
      return;
    }
    const whatsappDigits = formData.whatsapp.replace(/\D/g, "");
    if (whatsappDigits.length < 10 || whatsappDigits.length > 11) {
      toast.error("Informe um número de WhatsApp válido com DDD");
      return;
    }
    if (formData.name.trim().length < 3) {
      toast.error("Informe seu nome completo");
      return;
    }
    setLoading(true);
    try {
      await onSubmit({ name: formData.name.trim(), city: `${city} / ${uf}`, whatsapp: formData.whatsapp });
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
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="uf">Estado (UF) *</Label>
              {geoLoading && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Detectando...
                </span>
              )}
            </div>
            <select
              id="uf"
              value={uf}
              onChange={(e) => { setUf(e.target.value); setCity(""); }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            >
              <option value="">Selecione o estado</option>
              {STATES_LIST.map((s) => (
                <option key={s.abbr} value={s.abbr}>{s.name} ({s.abbr})</option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="city">Cidade *</Label>
            {loadingCities ? (
              <div className="flex items-center gap-2 h-10 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Carregando cidades...
              </div>
            ) : cities.length > 0 ? (
              <select
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              >
                <option value="">Selecione a cidade</option>
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            ) : (
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Selecione um estado primeiro"
                required
              />
            )}
          </div>

          <div>
            <Label htmlFor="whatsapp">WhatsApp *</Label>
            <Input
              id="whatsapp"
              type="tel"
              inputMode="numeric"
              value={formData.whatsapp}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
                const formatted = digits
                  .replace(/^(\d{2})(\d)/, "($1) $2")
                  .replace(/(\d{5})(\d)/, "$1-$2");
                setFormData({ ...formData, whatsapp: formatted });
              }}
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
                  {hidePricing ? <BlurredPrice value={totalPrice} className="text-xl" /> : `R$ ${totalPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
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
