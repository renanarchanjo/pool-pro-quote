import { Droplets } from "lucide-react";

const PARTNERS = [
  "Numai", "Acqua", "Albacete", "Maranata",
  "Acquazul", "Prime Pool", "Fiberpools", "Aqua Master",
];

const PartnersMarquee = () => {
  const logos = [...PARTNERS, ...PARTNERS];

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

      {/* Marquee container */}
      <div className="relative mt-10 md:mt-12 overflow-hidden group">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-20 md:w-[120px] z-10 pointer-events-none"
          style={{ background: "linear-gradient(to right, #FFFFFF, transparent)" }} />
        <div className="absolute right-0 top-0 bottom-0 w-20 md:w-[120px] z-10 pointer-events-none"
          style={{ background: "linear-gradient(to left, #FFFFFF, transparent)" }} />

        {/* Scrolling track */}
        <div
          className="flex gap-4 md:gap-5 w-max group-hover:[animation-play-state:paused]"
          style={{ animation: "marquee 28s linear infinite" }}
        >
          {logos.map((name, i) => (
            <div
              key={`${name}-${i}`}
              className="w-[100px] h-[100px] md:w-[120px] md:h-[120px] flex flex-col items-center justify-center gap-2.5 bg-[#F8F9FA] border border-[#E5E7EB] rounded-2xl shrink-0"
            >
              <Droplets className="w-10 h-10 md:w-12 md:h-12 text-[#0EA5E9]" strokeWidth={1.2} />
              <span className="text-[12px] font-medium text-[#6B7280] text-center leading-tight px-1">{name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PartnersMarquee;
