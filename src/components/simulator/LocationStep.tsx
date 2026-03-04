import { useState, useEffect } from "react";
import { MapPin, Loader2, Navigation, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGeolocation, STATES_LIST } from "@/hooks/useGeolocation";
import { supabase } from "@/integrations/supabase/client";

interface Store {
  id: string;
  name: string;
  state: string | null;
  city: string | null;
}

interface LocationStepProps {
  onSelectStore: (store: Store) => void;
  onBack: () => void;
  onSkip?: () => void;
}

const LocationStep = ({ onSelectStore, onBack, onSkip }: LocationStepProps) => {
  const { location, loading: geoLoading, error: geoError, detectLocation } = useGeolocation();
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [stores, setStores] = useState<Store[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    detectLocation();
  }, []);

  useEffect(() => {
    if (location) {
      setState(location.state);
      setCity(location.city);
    }
  }, [location]);

  useEffect(() => {
    if (state) {
      searchStores();
    }
  }, [state, city]);

  const searchStores = async () => {
    setLoadingStores(true);
    setSearched(true);
    try {
      let query = supabase
        .from("stores")
        .select("id, name, state, city")
        .eq("state", state);

      const { data, error } = await query;
      if (error) throw error;

      // Sort: same city first, then others in the state
      const sorted = (data || []).sort((a, b) => {
        const aMatch = a.city?.toLowerCase() === city.toLowerCase() ? 0 : 1;
        const bMatch = b.city?.toLowerCase() === city.toLowerCase() ? 0 : 1;
        return aMatch - bMatch || (a.name || "").localeCompare(b.name || "");
      });

      setStores(sorted);
    } catch (err) {
      console.error("Error searching stores:", err);
      setStores([]);
    } finally {
      setLoadingStores(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-10 animate-fade-in">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
          <MapPin className="w-4 h-4" />
          Localização
        </div>
        <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
          Onde você está?
        </h1>
        <p className="text-lg text-muted-foreground">
          Encontre lojistas parceiros na sua região
        </p>
      </div>

      <Card className="p-6 bg-card/80 backdrop-blur-sm mb-6">
        {geoLoading ? (
          <div className="flex items-center justify-center gap-3 py-8">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-muted-foreground">Detectando sua localização...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {geoError && (
              <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                {geoError}. Selecione manualmente abaixo.
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Estado</Label>
                <Select value={state} onValueChange={(v) => { setState(v); setCity(""); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATES_LIST.map((s) => (
                      <SelectItem key={s.abbr} value={s.abbr}>
                        {s.name} ({s.abbr})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cidade</Label>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Sua cidade"
                />
              </div>
            </div>

            {location && (
              <button
                onClick={detectLocation}
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Navigation className="w-3 h-3" />
                Redetectar minha localização
              </button>
            )}
          </div>
        )}
      </Card>

      {/* Store Results */}
      {searched && !loadingStores && (
        <div className="space-y-3 animate-fade-in">
          <h2 className="text-lg font-display font-semibold">
            {stores.length > 0
              ? `${stores.length} lojista(s) encontrado(s)`
              : "Nenhum lojista encontrado na sua região"}
          </h2>

          {stores.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Tente selecionar outro estado ou cidade.
            </p>
          )}

          {stores.map((store) => (
            <Card
              key={store.id}
              className="p-4 bg-card/80 backdrop-blur-sm hover:shadow-pool transition-all cursor-pointer group"
              onClick={() => onSelectStore(store)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display font-semibold text-lg">{store.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {store.city && `${store.city} - `}{store.state}
                    {store.city?.toLowerCase() === city.toLowerCase() && (
                      <span className="ml-2 text-primary font-medium">• Sua cidade</span>
                    )}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {loadingStores && (
        <div className="flex items-center justify-center gap-3 py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-muted-foreground">Buscando lojistas...</span>
        </div>
      )}

      <div className="mt-8 text-center">
        <button
          onClick={onSkip}
          className="text-sm text-muted-foreground hover:text-primary underline underline-offset-4 transition-colors"
        >
          Pular localização e ver todos os modelos
        </button>
      </div>
    </div>
  );
};

export default LocationStep;
