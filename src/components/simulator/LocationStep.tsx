import { useState, useEffect, useMemo } from "react";
import { MapPin, Loader2, Navigation, ChevronRight, Locate, Search, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGeolocation, STATES_LIST } from "@/hooks/useGeolocation";
import { supabase } from "@/integrations/supabase/client";
import NoStoresInRegion from "./NoStoresInRegion";

interface Store {
  id: string;
  name: string;
  state: string | null;
  city: string | null;
  latitude?: number | null;
  longitude?: number | null;
  coverage_radius_km?: number;
  coverage_radius_active?: boolean;
  distance?: number;
  logo_url?: string | null;
  plan_price?: number;
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

async function attachStoreLogos(stores: Store[]): Promise<Store[]> {
  if (stores.length === 0) return stores;
  const [logos, prices] = await Promise.all([
    Promise.all(
      stores.map(async (s) => {
        try {
          const { data } = await supabase.rpc("get_store_settings_public", { _store_id: s.id });
          return Array.isArray(data) && data.length > 0 ? (data[0] as any).logo_url : null;
        } catch {
          return null;
        }
      })
    ),
    (async () => {
      try {
        const { data } = await supabase.rpc("get_stores_plan_price_public");
        const map = new Map<string, number>();
        ((data as any[]) || []).forEach((r) => map.set(r.store_id, Number(r.price_monthly) || 0));
        return map;
      } catch {
        return new Map<string, number>();
      }
    })(),
  ]);
  return stores.map((s, i) => ({
    ...s,
    logo_url: logos[i] ?? null,
    plan_price: prices.get(s.id) ?? 0,
  }));
}

interface LocationStepProps {
  onSelectStore: (store: Store) => void;
  onBack: () => void;
  onSkip?: () => void;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const LocationStep = ({ onSelectStore, onBack, onSkip }: LocationStepProps) => {
  const { location, loading: geoLoading, error: geoError, detectLocation } = useGeolocation();
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [stores, setStores] = useState<Store[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [searched, setSearched] = useState(false);
  const [radiusSearch, setRadiusSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"default" | "alphabetical" | "city" | "distance">("default");

  useEffect(() => {
    detectLocation();
  }, []);

  useEffect(() => {
    if (location) {
      setState(location.state);
      setCity(location.city);
    }
  }, [location]);

  // Auto-search by city when state+city are set
  useEffect(() => {
    if (state && city) {
      searchStoresByCity();
    } else if (state && !city) {
      setStores([]);
      setSearched(false);
    }
  }, [state, city]);

  const searchStoresByCity = async () => {
    setLoadingStores(true);
    setSearched(true);
    setRadiusSearch(false);
    try {
      // Fetch stores matching state+city
      const { data: cityData, error: cityError } = await supabase
        .rpc("get_stores_public_by_state", { _state: state })
        .ilike("city" as any, city.trim());

      if (cityError) throw cityError;

      // Also fetch stores with coverage disabled (appear everywhere)
      const { data: allData } = await supabase.rpc("get_stores_public");
      const globalStores = ((allData as Store[]) || []).filter(
        (s) => s.coverage_radius_active === false
      );

      // Merge: city matches + global stores (deduplicate by id)
      const cityStores = (cityData as Store[]) || [];
      const seenIds = new Set(cityStores.map((s) => s.id));
      const merged = [
        ...cityStores,
        ...globalStores.filter((s) => !seenIds.has(s.id)),
      ];

      setStores(await attachStoreLogos(merged));
    } catch (err) {
      console.error("Error searching stores:", err);
      setStores([]);
    } finally {
      setLoadingStores(false);
    }
  };

  const searchStoresNearby = async () => {
    if (!location) {
      const loc = await detectLocation();
      if (!loc) return;
    }

    const userLat = location?.latitude;
    const userLon = location?.longitude;
    if (!userLat || !userLon) return;

    setLoadingStores(true);
    setSearched(true);
    setRadiusSearch(true);
    try {
      const { data, error } = await supabase
        .rpc("get_stores_public");

      if (error) throw error;

      const allStores = (data as Store[]) || [];

      // Stores with coverage disabled appear everywhere (no coords needed)
      const globalStores = allStores
        .filter((s) => s.coverage_radius_active === false)
        .map((s) => {
          if (s.latitude != null && s.longitude != null) {
            return { ...s, distance: haversineDistance(userLat, userLon, s.latitude!, s.longitude!) };
          }
          return { ...s, distance: undefined };
        });

      // Stores with coverage enabled need coords + distance check
      const radiusStores = allStores
        .filter((s) => s.coverage_radius_active !== false && s.latitude != null && s.longitude != null)
        .map((s) => ({
          ...s,
          distance: haversineDistance(userLat, userLon, s.latitude!, s.longitude!),
        }))
        .filter((s) => {
          const radius = s.coverage_radius_km || 50;
          return s.distance <= radius;
        });

      // Merge and deduplicate
      const seenIds = new Set(radiusStores.map((s) => s.id));
      const merged = [
        ...radiusStores,
        ...globalStores.filter((s) => !seenIds.has(s.id)),
      ].sort((a, b) => (a.distance ?? 99999) - (b.distance ?? 99999));

      setStores(await attachStoreLogos(merged));
    } catch (err) {
      console.error("Error searching nearby stores:", err);
      setStores([]);
    } finally {
      setLoadingStores(false);
    }
  };

  const visibleStores = useMemo(() => {
    let list = [...stores];
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(term) ||
          (s.city || "").toLowerCase().includes(term)
      );
    }
    if (sortBy === "alphabetical") {
      list.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    } else if (sortBy === "city") {
      list.sort((a, b) => (a.city || "").localeCompare(b.city || "", "pt-BR"));
    } else if (sortBy === "distance") {
      list.sort((a, b) => (a.distance ?? 99999) - (b.distance ?? 99999));
    } else {
      // Default: prioritize stores on higher-tier (more expensive) plans,
      // then by distance (when available), then alphabetically.
      list.sort((a, b) => {
        const priceDiff = (b.plan_price ?? 0) - (a.plan_price ?? 0);
        if (priceDiff !== 0) return priceDiff;
        const distDiff = (a.distance ?? 99999) - (b.distance ?? 99999);
        if (distDiff !== 0) return distDiff;
        return a.name.localeCompare(b.name, "pt-BR");
      });
    }
    return list;
  }, [stores, searchTerm, sortBy]);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-10 animate-fade-in">
        <h1 className="text-3xl md:text-5xl font-display font-bold mb-3">
          Onde você está?
        </h1>
        <p className="text-base md:text-lg text-muted-foreground">
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
          {stores.length > 0 ? (
            <h2 className="text-lg font-display font-semibold">
              {`${stores.length} loja${stores.length !== 1 ? "s" : ""} encontrada${stores.length !== 1 ? "s" : ""}`}
            </h2>
          ) : radiusSearch ? (
            <NoStoresInRegion />
          ) : (
            <>
              <h2 className="text-lg font-display font-semibold">Nenhuma loja encontrada nessa cidade</h2>
              <p className="text-sm text-muted-foreground">Tente usar o botão abaixo para buscar lojas próximas.</p>
            </>
          )}

          {stores.length > 1 && (
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nome ou cidade..."
                  className="pl-9"
                />
              </div>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="sm:w-56">
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Ordenar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Padrão</SelectItem>
                  <SelectItem value="alphabetical">Ordem alfabética (A-Z)</SelectItem>
                  <SelectItem value="city">Por cidade</SelectItem>
                  {radiusSearch && <SelectItem value="distance">Mais próximas</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          )}

          {searchTerm && visibleStores.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nenhuma loja corresponde a "{searchTerm}".
            </p>
          )}

          {visibleStores.map((store) => (
            <Card
              key={store.id}
              className="p-4 bg-card/80 backdrop-blur-sm hover:shadow-pool transition-all cursor-pointer group"
              onClick={() => onSelectStore(store)}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-white flex items-center justify-center flex-shrink-0 border border-border p-1">
                    {store.logo_url ? (
                      <img
                        src={store.logo_url}
                        alt={`Logo ${store.name}`}
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <span className="text-primary font-display font-semibold text-sm">
                        {getInitials(store.name)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-display font-semibold text-lg truncate">{store.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {store.city && `${store.city} - `}{store.state}
                      {store.distance != null && (
                        <span className="ml-2 text-primary font-medium">
                          • {store.distance < 1 ? "< 1" : Math.round(store.distance)} km
                        </span>
                      )}
                      {!radiusSearch && store.city?.toLowerCase() === city.toLowerCase() && (
                        <span className="ml-2 text-primary font-medium">• Sua cidade</span>
                      )}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {loadingStores && (
        <div className="flex items-center justify-center gap-3 py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-muted-foreground">Buscando lojas...</span>
        </div>
      )}

      <div className="mt-8 text-center">
        <Button
          onClick={searchStoresNearby}
          variant="outline"
          className="gradient-primary text-white border-0 hover:opacity-90"
        >
          <Locate className="w-4 h-4 mr-2" />
          Encontrar uma Loja próxima
        </Button>
      </div>
    </div>
  );
};

export default LocationStep;
