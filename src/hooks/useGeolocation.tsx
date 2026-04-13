import { useState, useCallback, useRef } from "react";

interface LocationData {
  state: string;
  city: string;
  latitude: number;
  longitude: number;
}

interface UseGeolocationReturn {
  location: LocationData | null;
  loading: boolean;
  error: string | null;
  detectLocation: () => Promise<LocationData | null>;
}

const BRAZILIAN_STATES: Record<string, string> = {
  "Acre": "AC", "Alagoas": "AL", "Amapá": "AP", "Amazonas": "AM",
  "Bahia": "BA", "Ceará": "CE", "Distrito Federal": "DF", "Espírito Santo": "ES",
  "Goiás": "GO", "Maranhão": "MA", "Mato Grosso": "MT", "Mato Grosso do Sul": "MS",
  "Minas Gerais": "MG", "Pará": "PA", "Paraíba": "PB", "Paraná": "PR",
  "Pernambuco": "PE", "Piauí": "PI", "Rio de Janeiro": "RJ", "Rio Grande do Norte": "RN",
  "Rio Grande do Sul": "RS", "Rondônia": "RO", "Roraima": "RR", "Santa Catarina": "SC",
  "São Paulo": "SP", "Sergipe": "SE", "Tocantins": "TO",
};

export const STATES_LIST = Object.entries(BRAZILIAN_STATES).map(([name, abbr]) => ({
  name,
  abbr,
})).sort((a, b) => a.name.localeCompare(b.name));

export const useGeolocation = (): UseGeolocationReturn => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastCallRef = useRef(0);

  const detectLocation = useCallback(async (): Promise<LocationData | null> => {
    // Throttle: at most one Nominatim call per 3 seconds
    const now = Date.now();
    if (now - lastCallRef.current < 3000) {
      return location;
    }
    lastCallRef.current = now;
    setLoading(true);
    setError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error("Geolocalização não suportada pelo navegador"));
          return;
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000,
        });
      });

      const { latitude, longitude } = position.coords;

      // Reverse geocoding via Nominatim (free, no key needed)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1&accept-language=pt-BR`,
        { headers: { "User-Agent": "SimulaPool/1.0" } }
      );

      if (!response.ok) throw new Error("Erro ao obter localização");

      const data = await response.json();
      const address = data.address;

      const stateName = address.state || "";
      const stateAbbr = BRAZILIAN_STATES[stateName] || stateName;
      const city = address.city || address.town || address.village || address.municipality || "";

      const locationData: LocationData = {
        state: stateAbbr,
        city,
        latitude,
        longitude,
      };

      setLocation(locationData);
      return locationData;
    } catch (err: any) {
      const message = err.code === 1
        ? "Permissão de localização negada"
        : err.code === 2
        ? "Localização indisponível"
        : err.code === 3
        ? "Tempo esgotado ao detectar localização"
        : err.message || "Erro ao detectar localização";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { location, loading, error, detectLocation };
};
