import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, GeoJSON, ZoomControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// State centroids (lat, lng) for fallback when store has no coordinates
const STATE_COORDS: Record<string, [number, number]> = {
  AC: [-9.0, -70.5], AL: [-9.6, -36.6], AP: [1.4, -51.1], AM: [-3.5, -64.0],
  BA: [-12.6, -41.7], CE: [-5.1, -39.3], DF: [-15.8, -47.9], ES: [-19.6, -40.3],
  GO: [-15.9, -49.6], MA: [-5.1, -45.3], MT: [-12.7, -55.9], MS: [-20.5, -54.8],
  MG: [-18.5, -44.4], PA: [-3.5, -52.5], PB: [-7.1, -36.6], PR: [-24.6, -51.4],
  PE: [-8.3, -37.3], PI: [-7.7, -42.7], RJ: [-22.5, -43.2], RN: [-5.8, -36.5],
  RS: [-29.7, -51.2], RO: [-10.9, -63.0], RR: [2.1, -61.4], SC: [-27.2, -49.4],
  SP: [-22.3, -48.6], SE: [-10.6, -37.1], TO: [-10.2, -48.3],
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

const pinIcon = L.divIcon({
  className: "custom-pin",
  html: `<svg width="26" height="34" viewBox="-8 -12 16 18" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="0" cy="2" rx="4" ry="1.5" fill="rgba(0,0,0,0.25)"/>
    <path d="M0,-12 C-5,-12 -8,-7 -8,-4 C-8,2 0,6 0,6 C0,6 8,2 8,-4 C8,-7 5,-12 0,-12 Z"
      fill="#EF4444" stroke="#FFFFFF" stroke-width="1.2"/>
    <circle cx="0" cy="-5" r="2.5" fill="#FFFFFF"/>
  </svg>`,
  iconSize: [26, 34],
  iconAnchor: [13, 30],
  popupAnchor: [0, -28],
});

function getColor(count: number): string {
  if (count <= 0) return "transparent";
  if (count === 1) return "#93C5FD";
  if (count <= 5) return "#3B82F6";
  if (count <= 10) return "#1D4ED8";
  return "#1E3A8A";
}

const FitBounds = ({ points }: { points: [number, number][] }) => {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 7 });
  }, [points, map]);
  return null;
};

const BrazilLeafletMap = ({ stores, stateData, height = 500 }: Props) => {
  const [geoData, setGeoData] = useState<any>(null);

  useEffect(() => {
    if (!stateData) return;
    fetch("/data/brazil-states.geojson")
      .then((r) => r.json())
      .then(setGeoData)
      .catch((err) => console.error("Failed to load GeoJSON:", err));
  }, [stateData]);

  // Group stores per location to offset overlapping pins
  const grouped: Record<string, StorePin[]> = {};
  stores.forEach((s) => {
    const key = s.latitude && s.longitude
      ? `${s.latitude},${s.longitude}`
      : `state:${s.state || "??"}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(s);
  });

  const markers: { coords: [number, number]; store: StorePin }[] = [];
  Object.entries(grouped).forEach(([, list]) => {
    list.forEach((s, idx) => {
      let base: [number, number] | null = null;
      if (s.latitude && s.longitude) base = [Number(s.latitude), Number(s.longitude)];
      else if (s.state && STATE_COORDS[s.state]) base = STATE_COORDS[s.state];
      if (!base) return;
      const offsetLat = idx * 0.08;
      const offsetLng = idx * 0.08;
      markers.push({ coords: [base[0] + offsetLat, base[1] + offsetLng], store: s });
    });
  });

  const points = markers.map((m) => m.coords);

  return (
    <div className="rounded-lg overflow-hidden border border-border" style={{ height }}>
      <MapContainer
        center={[-14.235, -51.925]}
        zoom={4}
        minZoom={3}
        maxZoom={18}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
        zoomControl={false}
      >
        <ZoomControl position="topright" />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &middot; <a href="https://carto.com/attributions">Carto</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          subdomains={["a", "b", "c", "d"]}
          maxZoom={19}
        />

        {stateData && geoData && (
          <GeoJSON
            data={geoData}
            style={(feature) => {
              const stateName = feature?.properties?.name || feature?.properties?.NAME;
              const abbr = STATE_ABBR[stateName] || stateName;
              const count = stateData[abbr] || 0;
              const color = getColor(count);
              return {
                fillColor: color,
                fillOpacity: count > 0 ? 0.45 : 0,
                color: "#94A3B8",
                weight: 0.7,
              };
            }}
            onEachFeature={(feature, layer) => {
              const stateName = feature?.properties?.name || feature?.properties?.NAME;
              const abbr = STATE_ABBR[stateName] || stateName;
              const count = stateData[abbr] || 0;
              layer.bindTooltip(
                `<strong>${abbr}</strong> · ${count} loja${count !== 1 ? "s" : ""}`,
                { sticky: true }
              );
            }}
          />
        )}

        {markers.map(({ coords, store }) => (
          <Marker key={store.id} position={coords} icon={pinIcon}>
            <Popup>
              <div style={{ minWidth: 160 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{store.name}</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  {store.city}{store.state ? `, ${store.state}` : ""}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
        <FitBounds points={points} />
      </MapContainer>
    </div>
  );
};

export default BrazilLeafletMap;
