import logoIcon from "@/assets/logo-icon-v3.webp";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  showSlogan?: boolean;
  variant?: "light" | "dark" | "auto";
}

const sizes = {
  sm: { img: "h-10 w-auto", text: "text-[20px]", slogan: "text-[9px]" },
  md: { img: "h-14 w-auto", text: "text-[26px]", slogan: "text-[11px]" },
  lg: { img: "h-[72px] w-auto", text: "text-[34px]", slogan: "text-[13px]" },
};

const BrandLogo = ({ size = "md", className = "", showSlogan = false, variant = "auto" }: BrandLogoProps) => {
  const s = sizes[size];

  const simulaColor = variant === "light"
    ? "text-white"
    : variant === "dark"
      ? "text-foreground"
      : "text-foreground";

  return (
    <div className={`flex items-center justify-center gap-0.5 ${className}`}>
      <img src={logoIcon} alt="SimulaPool" className={`${s.img} shrink-0`} loading="eager" decoding="async" fetchPriority="high" />
      <div className="flex flex-col">
        <span className={`${s.text} font-bold tracking-[-0.02em] leading-tight`}>
          <span className={simulaColor}>Simula</span>
          <span className="bg-gradient-to-r from-sky-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent drop-shadow-sm">Pool</span>
        </span>
        {showSlogan && (
          <span className={`${s.slogan} font-medium tracking-[0.08em] uppercase text-muted-foreground leading-tight mt-0.5`}>
            Orçamentos em Minutos!
          </span>
        )}
      </div>
    </div>
  );
};

export default BrandLogo;