import { useEffect } from "react";
import { motion } from "framer-motion";
import { Waves, Store, Handshake, ChevronRight, Sparkles } from "lucide-react";
import logoIcon from "@/assets/logo-icon-v3.webp";

type LinkItem = {
  label: string;
  desc: string;
  href: string;
  Icon: typeof Waves;
  iconBg: string;
  iconShadow: string;
  hoverText: string;
  featured?: boolean;
};

const LINKS: LinkItem[] = [
  {
    label: "Simular minha piscina",
    desc: "Monte seu orçamento em minutos",
    href: "/",
    Icon: Waves,
    iconBg: "bg-sky-500",
    iconShadow: "shadow-sky-500/40",
    hoverText: "group-hover:text-sky-300",
    featured: true,
  },
  {
    label: "Sou Lojista",
    desc: "Conheça a plataforma para sua loja",
    href: "/lojista",
    Icon: Store,
    iconBg: "bg-emerald-500",
    iconShadow: "shadow-emerald-500/30",
    hoverText: "group-hover:text-emerald-300",
  },
  {
    label: "Parceiros",
    desc: "Marcas e fabricantes parceiros",
    href: "/parceiros",
    Icon: Handshake,
    iconBg: "bg-amber-500",
    iconShadow: "shadow-amber-500/30",
    hoverText: "group-hover:text-amber-300",
  },
];

const Links = () => {
  // Force dark theme only on this page
  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => document.documentElement.classList.remove("dark");
  }, []);

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-[#020617] text-white selection:bg-sky-500/30">
      {/* Ambient blurred orbs — premium iOS depth */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full bg-sky-600/25 blur-[120px]" />
      <div className="pointer-events-none absolute top-1/3 -right-24 h-[360px] w-[360px] rounded-full bg-blue-900/40 blur-[110px]" />
      <div className="pointer-events-none absolute -bottom-32 left-1/4 h-[420px] w-[420px] rounded-full bg-cyan-500/15 blur-[140px]" />

      {/* Subtle noise grain via radial mask */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-overlay"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "3px 3px",
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-[440px] flex-col px-5 pt-[max(56px,env(safe-area-inset-top))] pb-[max(40px,env(safe-area-inset-bottom))]">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center text-center"
        >
          <div className="relative mb-6 cursor-pointer">
            <motion.div
              animate={{ opacity: [0.25, 0.55, 0.25] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -inset-2 rounded-full bg-sky-500 blur-2xl"
            />
            <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/5 shadow-2xl backdrop-blur-xl">
              <img
                src={logoIcon}
                alt="SimulaPool"
                className="h-16 w-16 rounded-full object-cover"
              />
            </div>
            </div>
          </div>

          <h1 className="text-[28px] font-bold tracking-tight text-white">
            <span>Simula</span>
            <span className="bg-gradient-to-r from-sky-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent drop-shadow-sm">
              Pool
            </span>
          </h1>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.22em] text-sky-400/80">
            Orçamentos em Minutos
          </p>
        </motion.div>

        {/* Links */}
        <div className="mt-10 flex flex-col gap-3.5">
          {LINKS.map((link, idx) => (
            <motion.a
              key={link.href}
              href={link.href}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: 0.2 + idx * 0.08,
                ease: [0.22, 1, 0.36, 1],
              }}
              whileTap={{ scale: 0.97 }}
              className={`group relative flex w-full items-center gap-4 overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.035] p-4 backdrop-blur-xl transition-all duration-300 hover:border-white/20 hover:bg-white/[0.07] active:bg-white/[0.09] ${
                link.featured ? "shadow-[0_8px_32px_rgba(14,165,233,0.18)]" : ""
              }`}
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              {/* Hover gradient sweep */}
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/[0.06] via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

              {/* Icon block */}
              <div className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] shadow-inner">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${link.iconBg} shadow-lg ${link.iconShadow}`}
                >
                  <link.Icon className="h-5 w-5 text-white" strokeWidth={2.2} />
                </div>
              </div>

              {/* Text */}
              <div className="relative flex-1 text-left">
                <h2
                  className={`text-[15px] font-semibold leading-tight text-white transition-colors ${link.hoverText}`}
                >
                  {link.label}
                </h2>
                <p className="mt-0.5 text-[12px] leading-snug text-white/45">
                  {link.desc}
                </p>
              </div>

              {/* Chevron */}
              <ChevronRight className="relative h-4 w-4 flex-shrink-0 text-white/25 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-white/60" />
            </motion.a>
          ))}
        </div>

        {/* Footer brand */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.8 }}
          className="mt-auto flex flex-col items-center pt-12"
        >
          <div className="h-px w-12 bg-white/10" />
          <span className="mt-4 text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">
            SimulaPool
          </span>
        </motion.div>
      </div>
    </div>
  );
};

export default Links;
