import { ReactNode } from "react";
import { Waves, ShieldCheck, Zap, Users } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";

interface AuthSplitShellProps {
  children: ReactNode;
  /** Eyebrow shown on the branding column. */
  eyebrow?: string;
  /** Main marketing headline shown on the branding column. */
  headline?: string;
  /** Supporting copy under the headline. */
  subline?: string;
}

const heroBg = "#0A1628";

const AuthSplitShell = ({
  children,
  eyebrow = "Painel SimulaPool",
  headline = "Suas propostas, leads e vendas em um só lugar.",
  subline = "Gere orçamentos profissionais, envie por WhatsApp em segundos e acompanhe cada cliente do primeiro clique ao fechamento.",
}: AuthSplitShellProps) => {
  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr]" style={{ background: heroBg }}>
      {/* Branding column — desktop only */}
      <aside
        className="hidden lg:flex relative overflow-hidden flex-col justify-between p-10 xl:p-14 text-white"
        style={{ background: heroBg }}
        aria-hidden="true"
      >
        {/* Atmospheric background */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute left-1/2 top-[35%] -translate-x-1/2 rounded-full"
            style={{
              width: 760, height: 760, opacity: 0.55,
              background: "radial-gradient(closest-side, rgba(14,165,233,0.55), transparent 70%)",
              filter: "blur(40px)",
            }}
          />
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(125,211,252,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(125,211,252,0.9) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
              maskImage: "radial-gradient(ellipse at center, black 40%, transparent 78%)",
              WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 78%)",
            }}
          />
        </div>

        {/* Top: brand */}
        <div className="relative">
          <BrandLogo size="md" className="[&_span]:text-white" />
        </div>

        {/* Middle: headline */}
        <div className="relative max-w-md">
          <span
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-[0.14em] mb-5"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}
          >
            <Waves className="w-3.5 h-3.5 text-[#38BDF8]" />
            {eyebrow}
          </span>
          <h2
            className="font-sp-display font-extrabold text-balance leading-[1.05] tracking-tight mb-4"
            style={{ fontSize: "clamp(28px, 3vw, 40px)" }}
          >
            {headline}
          </h2>
          <p className="text-white/65 text-[15px] leading-relaxed max-w-md">{subline}</p>

          {/* Trust strip */}
          <ul className="mt-8 space-y-3 text-[13.5px] text-white/75">
            <li className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: "rgba(56,189,248,0.12)" }}>
                <Zap className="w-3.5 h-3.5 text-[#38BDF8]" />
              </span>
              Propostas em menos de 1 minuto
            </li>
            <li className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: "rgba(56,189,248,0.12)" }}>
                <Users className="w-3.5 h-3.5 text-[#38BDF8]" />
              </span>
              Equipe, leads e funil de vendas
            </li>
            <li className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: "rgba(56,189,248,0.12)" }}>
                <ShieldCheck className="w-3.5 h-3.5 text-[#38BDF8]" />
              </span>
              Dados protegidos · LGPD
            </li>
          </ul>
        </div>

        {/* Bottom: legal */}
        <div className="relative text-[12px] text-white/45">
          © {new Date().getFullYear()} SimulaPool · Todos os direitos reservados
        </div>
      </aside>

      {/* Form column */}
      <main className="relative flex items-center justify-center p-4 sm:p-8" style={{ background: heroBg }}>
        {children}
      </main>
    </div>
  );
};

export default AuthSplitShell;
