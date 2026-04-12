import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const STATE_ABBR: Record<string, string> = {
  "Acre": "AC", "Alagoas": "AL", "Amapá": "AP", "Amazonas": "AM",
  "Bahia": "BA", "Ceará": "CE", "Distrito Federal": "DF", "Espírito Santo": "ES",
  "Goiás": "GO", "Maranhão": "MA", "Mato Grosso": "MT", "Mato Grosso do Sul": "MS",
  "Minas Gerais": "MG", "Pará": "PA", "Paraíba": "PB", "Paraná": "PR",
  "Pernambuco": "PE", "Piauí": "PI", "Rio de Janeiro": "RJ", "Rio Grande do Norte": "RN",
  "Rio Grande do Sul": "RS", "Rondônia": "RO", "Roraima": "RR", "Santa Catarina": "SC",
  "São Paulo": "SP", "Sergipe": "SE", "Tocantins": "TO",
};

// Approximate centroids for each state
const STATE_COORDS: Record<string, [number, number]> = {
  AC: [-70.5, -9.0], AL: [-36.6, -9.6], AP: [-51.1, 1.4], AM: [-64.0, -3.5],
  BA: [-41.7, -12.6], CE: [-39.3, -5.1], DF: [-47.9, -15.8], ES: [-40.3, -19.6],
  GO: [-49.6, -15.9], MA: [-45.3, -5.1], MT: [-55.9, -12.7], MS: [-54.8, -20.5],
  MG: [-44.4, -18.5], PA: [-52.5, -3.5], PB: [-36.6, -7.1], PR: [-51.4, -24.6],
  PE: [-37.3, -8.3], PI: [-42.7, -7.7], RJ: [-43.2, -22.5], RN: [-36.5, -5.8],
  RS: [-51.2, -29.7], RO: [-63.0, -10.9], RR: [-61.4, 2.1], SC: [-49.4, -27.2],
  SP: [-48.6, -22.3], SE: [-37.1, -10.6], TO: [-48.3, -10.2],
};

function getColor(count: number): string {
  if (count <= 0) return "#D1D5DB";
  if (count === 1) return "#93C5FD";
  if (count <= 5) return "#3B82F6";
  if (count <= 10) return "#1D4ED8";
  return "#1E3A8A";
}

function getDarkColor(count: number): string {
  if (count <= 0) return "#374151";
  if (count === 1) return "#1E3A5F";
  if (count <= 5) return "#1E40AF";
  if (count <= 10) return "#2563EB";
  return "#3B82F6";
}

export interface StorePin {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
}

interface Props {
  stateData: Record<string, number>;
  stores?: StorePin[];
}

const BrazilMap = ({ stateData, stores = [] }: Props) => {
  const [tooltip, setTooltip] = useState<{ name: string; count: number } | null>(null);
  const [hoveredPin, setHoveredPin] = useState<StorePin | null>(null);
  const [geoData, setGeoData] = useState<unknown>(null);

  useEffect(() => {
    fetch("/data/brazil-states.geojson")
      .then((r) => r.json())
      .then(setGeoData)
      .catch((err) => console.error("Failed to load GeoJSON:", err));
  }, []);

  // Group stores by state for pin placement with offset
  const pinsByState: Record<string, StorePin[]> = {};
  stores.forEach((s) => {
    const st = s.state || "??";
    if (!pinsByState[st]) pinsByState[st] = [];
    pinsByState[st].push(s);
  });

  if (!geoData) {
    return (
      <div className="relative">
        <Skeleton className="w-full rounded-lg" style={{ aspectRatio: "6/5" }} />
        <p className="text-center text-xs text-muted-foreground mt-2 animate-pulse">Carregando mapa…</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 600, center: [-54, -15] }}
        width={600}
        height={500}
        style={{ width: "100%", height: "auto" }}
      >
        <Geographies geography={geoData}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const stateName = geo.properties.name || geo.properties.NAME;
              const abbr = STATE_ABBR[stateName] || stateName;
              const count = stateData[abbr] || 0;
              const isDark = document.documentElement.classList.contains("dark");
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={isDark ? getDarkColor(count) : getColor(count)}
                  stroke={isDark ? "#4B5563" : "#9CA3AF"}
                  strokeWidth={0.8}
                  onMouseEnter={() => setTooltip({ name: abbr, count })}
                  onMouseLeave={() => setTooltip(null)}
                  style={{
                    default: { outline: "none" },
                    hover: { outline: "none", fill: "#0EA5E9", cursor: "pointer" },
                    pressed: { outline: "none" },
                  }}
                />
              );
            })
          }
        </Geographies>

        {/* Store pins */}
        {Object.entries(pinsByState).map(([state, storesInState]) =>
          storesInState.map((store, idx) => {
            const base = STATE_COORDS[state];
            if (!base) return null;
            // Offset multiple pins in same state
            const offsetX = idx * 1.2;
            const offsetY = idx * 0.8;
            const coords: [number, number] = [base[0] + offsetX, base[1] + offsetY];
            return (
              <Marker key={store.id} coordinates={coords}>
                <g
                  onMouseEnter={() => setHoveredPin(store)}
                  onMouseLeave={() => setHoveredPin(null)}
                  style={{ cursor: "pointer" }}
                >
                  {/* Pin shadow */}
                  <ellipse cx={0} cy={2} rx={4} ry={1.5} fill="rgba(0,0,0,0.2)" />
                  {/* Pin body */}
                  <path
                    d="M0,-12 C-5,-12 -8,-7 -8,-4 C-8,2 0,6 0,6 C0,6 8,2 8,-4 C8,-7 5,-12 0,-12 Z"
                    fill="#EF4444"
                    stroke="#FFFFFF"
                    strokeWidth={1.2}
                  />
                  {/* Pin dot */}
                  <circle cx={0} cy={-5} r={2.5} fill="#FFFFFF" />
                </g>
              </Marker>
            );
          })
        )}
      </ComposableMap>

      {/* State tooltip */}
      {tooltip && !hoveredPin && (
        <div className="absolute top-4 right-4 bg-card border border-border rounded-lg px-3 py-2 shadow-sm text-[12px] pointer-events-none">
          <span className="font-semibold text-foreground">{tooltip.name}</span>
          <span className="text-muted-foreground ml-2">{tooltip.count} lojista{tooltip.count !== 1 ? "s" : ""}</span>
        </div>
      )}

      {/* Pin tooltip */}
      {hoveredPin && (
        <div className="absolute top-4 right-4 bg-card border border-border rounded-lg px-3 py-2 shadow-sm text-[12px] pointer-events-none">
          <div className="font-semibold text-foreground flex items-center gap-1.5">
            <span className="text-red-500">📍</span> {hoveredPin.name}
          </div>
          <div className="text-muted-foreground">{hoveredPin.city}{hoveredPin.state ? `, ${hoveredPin.state}` : ""}</div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-[11px] text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#93C5FD] dark:bg-[#1E3A5F] border border-border" /> 1</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#3B82F6] dark:bg-[#1E40AF] border border-border" /> 2–5</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#1D4ED8] dark:bg-[#2563EB] border border-border" /> 6–10</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#1E3A8A] dark:bg-[#3B82F6] border border-border" /> 10+</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#D1D5DB] dark:bg-[#374151] border border-border" /> Sem lojistas</span>
        <span className="flex items-center gap-1.5">
          <svg width="12" height="14" viewBox="-8 -12 16 18"><path d="M0,-12 C-5,-12 -8,-7 -8,-4 C-8,2 0,6 0,6 C0,6 8,2 8,-4 C8,-7 5,-12 0,-12 Z" fill="#EF4444" stroke="#fff" strokeWidth="1"/></svg>
          Loja ativa
        </span>
      </div>
    </div>
  );
};

export default BrazilMap;
