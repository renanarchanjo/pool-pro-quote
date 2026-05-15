import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Waves, Store, Handshake, ChevronRight } from "lucide-react";
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

// Prefetch destination chunks the moment user hovers/touches a link
const prefetchRoute = (href: string) => {
  switch (href) {
    case "/lojista":
      import("./Lojista");
      break;
    case "/parceiros":
      import("./Parceiros");
      break;
    // "/" (Index) is eager-loaded in App.tsx — no prefetch needed
  }
};

const MotionLink = motion(Link);

const Links = () => {
  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => document.documentElement.classList.remove("dark");
  }, []);

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-[#020617] text-white selection:bg-sky-500/30">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full bg-sky-600/20 blur-[120px]" />
      <div className="pointer-events-none absolute top-1/3 -right-24 h-[360px] w-[360px] rounded-full bg-blue-900/30 blur-[110px]" />
      <div className="pointer-events-none absolute -bottom-32 left-1/4 h-[420px] w-[420px] rounded-full bg-cyan-500/12 blur-[140px]" />

      {/* Subtle grain */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03] mix-blend-overlay"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "3px 3px",
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-[440px] flex-col px-5 pt-[max(48px,env(safe-area-inset-top))] pb-[max(32px,env(safe-area-inset-bottom))]">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center text-center"
        >
          {/* Avatar */}
          <div className="relative mb-5">
            {/* Breathing glow */}
            <motion.div
              animate={{ opacity: [0.15, 0.3, 0.15], scale: [0.95, 1.05, 0.95] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -inset-3 rounded-full bg-sky-500 blur-2xl"
            />
            <motion.div
              className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/[0.04] shadow-2xl backdrop-blur-xl"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <img
                src={logoIcon}
                alt="SimulaPool"
                width={64}
                height={64}
                fetchPriority="high"
                decoding="async"
                className="h-16 w-16 rounded-full object-cover"
              />
            </motion.div>
          </div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="text-[28px] font-bold tracking-tight"
          >
            <span className="text-white">Simula</span>
            <span className="bg-gradient-to-r from-sky-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent drop-shadow-sm">
              Pool
            </span>
          </motion.h1>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="mt-1 text-[10px] font-bold uppercase tracking-[0.22em] text-sky-400/70"
          >
            Orçamentos em Minutos
          </motion.p>
        </motion.div>

        {/* Links — staggered entrance, SPA navigation via react-router Link */}
        <div className="mt-10 flex flex-col gap-3">
          {LINKS.map((link, idx) => (
            <MotionLink
              key={link.href}
              to={link.href}
              onMouseEnter={() => prefetchRoute(link.href)}
              onTouchStart={() => prefetchRoute(link.href)}
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.5,
                delay: 0.35 + idx * 0.07,
                ease: [0.22, 1, 0.36, 1],
              }}
              whileTap={{ scale: 0.97 }}
              className={`group relative flex w-full items-center gap-4 overflow-hidden rounded-3xl border border-white/[0.06] bg-white/[0.03] p-4 backdrop-blur-xl transition-colors duration-300 hover:border-white/15 hover:bg-white/[0.06] ${
                link.featured ? "shadow-[0_4px_24px_rgba(14,165,233,0.12)]" : ""
              }`}
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              {/* Subtle hover gradient */}
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/[0.04] via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

              {/* Icon */}
              <div className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03]">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${link.iconBg} shadow-lg ${link.iconShadow}`}
                >
                  <link.Icon className="h-5 w-5 text-white" strokeWidth={2.2} />
                </div>
              </div>

              {/* Text */}
              <div className="relative flex-1 text-left">
                <h2
                  className={`text-[15px] font-semibold leading-tight text-white transition-colors duration-300 ${link.hoverText}`}
                >
                  {link.label}
                </h2>
                <p className="mt-0.5 text-[12px] leading-snug text-white/40">
                  {link.desc}
                </p>
              </div>

              {/* Chevron */}
              <ChevronRight className="relative h-4 w-4 flex-shrink-0 text-white/20 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-white/50" />
            </MotionLink>
          ))}
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 1 }}
          className="mt-auto flex flex-col items-center pt-10"
        >
          <div className="h-px w-10 bg-white/[0.08]" />
          <span className="mt-3 text-[9px] font-semibold uppercase tracking-[0.3em] text-white/20">
            SimulaPool
          </span>
        </motion.div>
      </div>
    </div>
  );
};

export default Links;
