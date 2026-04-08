import logoIcon from "@/assets/logo-icon.png";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: { img: "w-6 h-6", text: "text-[15px]" },
  md: { img: "w-8 h-8", text: "text-[18px]" },
  lg: { img: "w-10 h-10", text: "text-[22px]" },
};

const BrandLogo = ({ size = "md", className = "" }: BrandLogoProps) => {
  const s = sizes[size];
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img src={logoIcon} alt="SimulaPool" className={`${s.img} rounded-lg`} />
      <span className={`${s.text} font-bold tracking-[-0.01em] text-foreground`}>
        SimulaPool
      </span>
    </div>
  );
};

export default BrandLogo;
