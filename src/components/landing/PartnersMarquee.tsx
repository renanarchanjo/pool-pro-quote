import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Partner {
  id: string;
  name: string;
  logo_url: string | null;
}

const getInitials = (name: string) =>
  name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

const PartnersMarquee = () => {
  const [partners, setPartners] = useState<Partner[]>([]);

  useEffect(() => {
    supabase
      .from("partners")
      .select("id, name, logo_url")
      .eq("active", true)
      .order("ranking", { ascending: true })
      .then(({ data }) => {
        if (data?.length) setPartners(data as Partner[]);
      });
  }, []);

  if (partners.length === 0) return null;

  // Ensure minimum items for smooth loop
  let items = [...partners, ...partners];
  if (partners.length < 6) items = [...partners, ...partners, ...partners];

  return (
    <section className="bg-[#FFFFFF] py-16 md:py-20">
      <div className="text-center px-4">
        <span className="inline-flex items-center text-[11px] font-semibold uppercase text-[#0369A1] bg-[#E0F2FE] border border-[#0EA5E9] rounded-full px-4 py-1.5">
          Parceiros
        </span>
        <h2 className="text-[26px] md:text-[32px] font-bold text-[#0D0D0D] mt-4">
          Marcas que confiam no SimulaPool
        </h2>
        <p className="text-[15px] text-[#6B7280] mt-2">
          Revendedores e fabricantes de piscinas de fibra em todo o Brasil.
        </p>
      </div>

      <div className="relative mt-10 md:mt-12 overflow-hidden group">
        <div className="absolute left-0 top-0 bottom-0 w-20 md:w-[120px] z-10 pointer-events-none"
          style={{ background: "linear-gradient(to right, #FFFFFF, transparent)" }} />
        <div className="absolute right-0 top-0 bottom-0 w-20 md:w-[120px] z-10 pointer-events-none"
          style={{ background: "linear-gradient(to left, #FFFFFF, transparent)" }} />

        <div
          className="flex gap-4 md:gap-5 w-max group-hover:[animation-play-state:paused]"
          style={{ animation: "marquee 28s linear infinite" }}
        >
          {items.map((p, i) => (
            <div
              key={`${p.id}-${i}`}
              className="w-[100px] h-[100px] md:w-[120px] md:h-[120px] flex flex-col items-center justify-center gap-2.5 bg-[#F8F9FA] border border-[#E5E7EB] rounded-2xl shrink-0"
            >
              {p.logo_url ? (
                <img
                  src={p.logo_url}
                  alt={p.name}
                  className="w-10 h-10 md:w-12 md:h-12 object-contain"
                />
              ) : (
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-[#E0F2FE] flex items-center justify-center">
                  <span className="text-[14px] md:text-[16px] font-semibold text-[#0369A1]">
                    {getInitials(p.name)}
                  </span>
                </div>
              )}
              <span className="text-[12px] font-medium text-[#6B7280] text-center leading-tight px-1 truncate max-w-full">
                {p.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PartnersMarquee;
