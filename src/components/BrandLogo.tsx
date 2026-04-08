import logoIcon from "@/assets/logo-icon.png";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: { img: "h-7 w-auto", text: "text-[15px]" },
  md: { img: "h-9 w-auto", text: "text-[18px]" },
  lg: { img: "h-11 w-auto", text: "text-[22px]" },
};

const BrandLogo = ({ size = "md", className = "" }: BrandLogoProps) => {
  const s = sizes[size];
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img src={logoIcon} alt="SimulaPool" className={s.img} />
      <span className={`${s.text} font-bold tracking-[-0.01em] text-foreground`}>
        SimulaPool
      </span>
    </div>
  );
};

export default BrandLogo;
