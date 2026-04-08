import { useEffect, useState } from "react";
import { motion } from "framer-motion";
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

  const base = [...partners];
  while (base.length < 12) base.push(...partners);
  const track = [...base, ...base];

  return (
    <section className="bg-background py-14 md:py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="text-center px-4 mb-10 md:mb-12"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-3">
          PARCEIROS
        </p>
        <h2 className="text-[22px] md:text-[28px] font-bold text-foreground tracking-[-0.02em]">
          Marcas que confiam no SimulaPool
        </h2>
      </motion.div>

      <div className="relative overflow-hidden group">
        <div
          className="absolute left-0 top-0 bottom-0 w-16 md:w-24 z-10 pointer-events-none"
          style={{ background: "linear-gradient(to right, hsl(var(--background)), transparent)" }}
        />
        <div
          className="absolute right-0 top-0 bottom-0 w-16 md:w-24 z-10 pointer-events-none"
          style={{ background: "linear-gradient(to left, hsl(var(--background)), transparent)" }}
        />

        <div
          className="flex gap-4 group-hover:[animation-play-state:paused]"
          style={{
            width: `${track.length * 136}px`,
            animation: "marquee 30s linear infinite",
          }}
        >
          {track.map((p, i) => (
            <div
              key={`${p.id}-${i}`}
              className="w-[120px] h-[120px] flex flex-col items-center justify-center gap-2.5 bg-secondary border border-border rounded-2xl shrink-0 transition-all duration-300 hover:border-primary/20 hover:shadow-[0_4px_20px_-8px_rgba(14,165,233,0.12)]"
            >
              {p.logo_url ? (
                <img src={p.logo_url} alt={p.name} className="w-12 h-12 object-contain" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-[16px] font-semibold text-primary">{getInitials(p.name)}</span>
                </div>
              )}
              <span className="text-[12px] font-medium text-muted-foreground text-center leading-tight px-1 truncate max-w-[110px]">
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
