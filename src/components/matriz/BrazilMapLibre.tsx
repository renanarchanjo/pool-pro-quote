import { useEffect, useMemo, useRef, useState } from "react";
import Map, { Marker, Popup, NavigationControl, Source, Layer, MapRef } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// State centroids (lng, lat) for fallback
const STATE_COORDS: Record<string, [number, number]> = {
  AC: [-70.5, -9.0], AL: [-36.6, -9.6], AP: [-51.1, 1.4], AM: [-64.0, -3.5],
  BA: [-41.7, -12.6], CE: [-39.3, -5.1], DF: [-47.9, -15.8], ES: [-40.3, -19.6],
  GO: [-49.6, -15.9], MA: [-45.3, -5.1], MT: [-55.9, -12.7], MS: [-54.8, -20.5],
  MG: [-44.4, -18.5], PA: [-52.5, -3.5], PB: [-36.6, -7.1], PR: [-51.4, -24.6],
  PE: [-37.3, -8.3], PI: [-42.7, -7.7], RJ: [-43.2, -22.5], RN: [-36.5, -5.8],
  RS: [-51.2, -29.7], RO: [-63.0, -10.9], RR: [-61.4, 2.1], SC: [-49.4, -27.2],
  SP: [-48.6, -22.3], SE: [-37.1, -10.6], TO: [-48.3, -10.2],
};

const STATE_ABBR: Record<string, string> = {
  "Acre": "AC", "Alagoas": "AL", "Amapá": "AP", "Amazonas": "AM",
  "Bahia": "BA", "Ceará": "CE", "Distrito Federal": "DF", "Espírito Santo": "ES",
  "Goiás": "GO", "Maranhão": "MA", "Mato Grosso": "MT", "Mato Grosso do Sul": "MS",
  "Minas Gerais": "MG", "Pará": "PA", "Paraíba": "PB", "Paraná": "PR",
  "Pernambuco": "PE", "Piauí": "PI", "Rio de Janeiro": "RJ", "Rio Grande do Norte": "RN",
  "Rio Grande do Sul": "RS", "Rondônia": "RO", "Roraima": "RR", "Santa Catarina": "SC",
  "São Paulo": "SP", "Sergipe": "SE", "Tocantins": "TO",
};

export interface StorePin {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface Props {
  stores: StorePin[];
  stateData?: Record<string, number>;
  height?: number | string;
}

// MapLibre style using free CartoDB Voyager raster tiles (no token required)
const MAP_STYLE: any = {
  version: 8,
  sources: {
    "carto-light": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
        "https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [
    { id: "carto-light-layer", type: "raster", source: "carto-light" },
  ],
};

const BrazilMapLibre = ({ stores, stateData, height = 500 }: Props) => {
  const mapRef = useRef<MapRef | null>(null);
  const [geoData, setGeoData] = useState<any>(null);
  const [popup, setPopup] = useState<{ store: StorePin; lng: number; lat: number } | null>(null);

  useEffect(() => {
    if (!stateData) return;
    fetch("/data/brazil-states.geojson")
      .then((r) => r.json())
      .then((gj) => {
        // Inject store count into each feature
        const enriched = {
          ...gj,
          features: gj.features.map((f: any) => {
            const name = f.properties?.name || f.properties?.NAME;
            const abbr = STATE_ABBR[name] || name;
            return {
              ...f,
              properties: { ...f.properties, abbr, count: stateData[abbr] || 0 },
            };
          }),
        };
        setGeoData(enriched);
      })
      .catch((err) => console.error("Failed to load GeoJSON:", err));
  }, [stateData]);

  const [geocoded, setGeocoded] = useState<Record<string, [number, number]>>({});

  // Geocode city+state via Nominatim with localStorage cache
  useEffect(() => {
    const CACHE_KEY = "geocode_cache_v1";
    let cache: Record<string, [number, number]> = {};
    try { cache = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"); } catch {}

    const toGeocode = stores.filter(
      (s) => !(s.latitude && s.longitude) && s.city && s.state
    );

    const initial: Record<string, [number, number]> = {};
    const pending: StorePin[] = [];
    toGeocode.forEach((s) => {
      const key = `${s.city!.toLowerCase()}|${s.state!.toLowerCase()}`;
      if (cache[key]) initial[s.id] = cache[key];
      else pending.push(s);
    });
    if (Object.keys(initial).length) setGeocoded((g) => ({ ...g, ...initial }));

    let cancelled = false;
    (async () => {
      for (const s of pending) {
        const key = `${s.city!.toLowerCase()}|${s.state!.toLowerCase()}`;
        try {
          const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&country=Brazil&state=${encodeURIComponent(s.state!)}&city=${encodeURIComponent(s.city!)}`;
          const r = await fetch(url, { headers: { "Accept-Language": "pt-BR" } });
          const data = await r.json();
          if (data?.[0]) {
            const coord: [number, number] = [parseFloat(data[0].lon), parseFloat(data[0].lat)];
            cache[key] = coord;
            localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
            if (!cancelled) setGeocoded((g) => ({ ...g, [s.id]: coord }));
          }
        } catch (e) {
          console.warn("Geocode failed for", s.city, s.state, e);
        }
        await new Promise((res) => setTimeout(res, 1100)); // Nominatim rate limit
      }
    })();
    return () => { cancelled = true; };
  }, [stores]);

  const markers = useMemo(() => {
    const out: { lng: number; lat: number; store: StorePin }[] = [];
    const usedCoords = new Map<string, number>();
    stores.forEach((s) => {
      let base: [number, number] | null = null;
      if (s.latitude && s.longitude) base = [Number(s.longitude), Number(s.latitude)];
      else if (geocoded[s.id]) base = geocoded[s.id];
      else if (s.state && STATE_COORDS[s.state]) base = STATE_COORDS[s.state];
      if (!base) return;
      const k = `${base[0].toFixed(3)},${base[1].toFixed(3)}`;
      const idx = usedCoords.get(k) || 0;
      usedCoords.set(k, idx + 1);
      const offset = idx * 0.02;
      out.push({ lng: base[0] + offset, lat: base[1] + offset, store: s });
    });
    return out;
  }, [stores, geocoded]);

  // Auto-fit bounds when markers change
  useEffect(() => {
    if (!mapRef.current || markers.length === 0) return;
    const bounds = new maplibregl.LngLatBounds();
    markers.forEach((m) => bounds.extend([m.lng, m.lat]));
    mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 7, duration: 800 });
  }, [markers]);

  return (
    <div className="rounded-lg overflow-hidden border border-border relative" style={{ height }}>
      <Map
        ref={mapRef}
        initialViewState={{ longitude: -51.925, latitude: -14.235, zoom: 3.6 }}
        minZoom={2.5}
        maxZoom={18}
        mapStyle={MAP_STYLE}
        attributionControl={{ compact: true }}
      >
        <NavigationControl position="top-right" showCompass={false} />

        {stateData && geoData && (
          <Source id="states" type="geojson" data={geoData}>
            <Layer
              id="states-fill"
              type="fill"
              paint={{
                "fill-color": [
                  "step",
                  ["get", "count"],
                  "rgba(0,0,0,0)",
                  1, "#93C5FD",
                  2, "#3B82F6",
                  6, "#1D4ED8",
                  11, "#1E3A8A",
                ],
                "fill-opacity": [
                  "case",
                  [">", ["get", "count"], 0], 0.45, 0,
                ],
              }}
            />
            <Layer
              id="states-line"
              type="line"
              paint={{ "line-color": "#94A3B8", "line-width": 0.7 }}
            />
          </Source>
        )}

        {markers.map(({ lng, lat, store }) => (
          <Marker
            key={store.id}
            longitude={lng}
            latitude={lat}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setPopup({ store, lng, lat });
            }}
          >
            <div style={{ cursor: "pointer", transform: "translateY(2px)" }}>
              <svg width="28" height="36" viewBox="-8 -12 16 18" xmlns="http://www.w3.org/2000/svg">
                <ellipse cx="0" cy="2" rx="4" ry="1.5" fill="rgba(0,0,0,0.25)" />
                <path
                  d="M0,-12 C-5,-12 -8,-7 -8,-4 C-8,2 0,6 0,6 C0,6 8,2 8,-4 C8,-7 5,-12 0,-12 Z"
                  fill="#EF4444"
                  stroke="#FFFFFF"
                  strokeWidth={1.2}
                />
                <circle cx="0" cy="-5" r="2.5" fill="#FFFFFF" />
              </svg>
            </div>
          </Marker>
        ))}

        {popup && (
          <Popup
            longitude={popup.lng}
            latitude={popup.lat}
            anchor="top"
            offset={12}
            onClose={() => setPopup(null)}
            closeButton
            closeOnClick={false}
          >
            <div style={{ minWidth: 160 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{popup.store.name}</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                {popup.store.city}
                {popup.store.state ? `, ${popup.store.state}` : ""}
              </div>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
};

export default BrazilMapLibre;
