import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { useState } from "react";

const GEO_URL = "https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson";

const STATE_ABBR: Record<string, string> = {
  "Acre": "AC", "Alagoas": "AL", "Amapá": "AP", "Amazonas": "AM",
  "Bahia": "BA", "Ceará": "CE", "Distrito Federal": "DF", "Espírito Santo": "ES",
  "Goiás": "GO", "Maranhão": "MA", "Mato Grosso": "MT", "Mato Grosso do Sul": "MS",
  "Minas Gerais": "MG", "Pará": "PA", "Paraíba": "PB", "Paraná": "PR",
  "Pernambuco": "PE", "Piauí": "PI", "Rio de Janeiro": "RJ", "Rio Grande do Norte": "RN",
  "Rio Grande do Sul": "RS", "Rondônia": "RO", "Roraima": "RR", "Santa Catarina": "SC",
  "São Paulo": "SP", "Sergipe": "SE", "Tocantins": "TO",
};

function getColor(count: number): string {
  if (count <= 0) return "#F3F4F6";
  if (count === 1) return "#E0F2FE";
  if (count <= 5) return "#7DD3FC";
  if (count <= 10) return "#0EA5E9";
  return "#0284C7";
}

interface Props {
  stateData: Record<string, number>;
}

const BrazilMap = ({ stateData }: Props) => {
  const [tooltip, setTooltip] = useState<{ name: string; count: number } | null>(null);

  return (
    <div className="relative">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 600, center: [-54, -15] }}
        width={600}
        height={500}
        style={{ width: "100%", height: "auto" }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const stateName = geo.properties.name || geo.properties.NAME;
              const abbr = STATE_ABBR[stateName] || stateName;
              const count = stateData[abbr] || 0;
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={getColor(count)}
                  stroke="#FFFFFF"
                  strokeWidth={1}
                  onMouseEnter={() => setTooltip({ name: abbr, count })}
                  onMouseLeave={() => setTooltip(null)}
                  style={{
                    default: { outline: "none" },
                    hover: { outline: "none", fill: "#0284C7", cursor: "pointer" },
                    pressed: { outline: "none" },
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>
      {tooltip && (
        <div className="absolute top-4 right-4 bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 shadow-sm text-[12px] pointer-events-none">
          <span className="font-semibold text-[#0D0D0D]">{tooltip.name}</span>
          <span className="text-[#6B7280] ml-2">{tooltip.count} lojista{tooltip.count !== 1 ? "s" : ""}</span>
        </div>
      )}
    </div>
  );
};

export default BrazilMap;
