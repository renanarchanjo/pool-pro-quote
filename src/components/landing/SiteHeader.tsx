import { Link, useLocation } from "react-router-dom";
import logoIcon from "@/assets/logo-icon.png";

interface SiteHeaderProps {
  onSimulate?: () => void;
}

const SiteHeader = ({ onSimulate }: SiteHeaderProps) => {
  const location = useLocation();

  return (
    <>
      <div className="h-0 w-full md:hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }} />

      <nav className="sticky top-0 z-50 bg-[#FFFFFF] border-b border-[#E5E7EB] h-14">
        <div className="container mx-auto px-4 h-full flex items-center justify-between">
          {/* Logo + status */}
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2">
              <img src={logoIcon} alt="SimulaPool" className="w-8 h-8 rounded-lg" />
              <span className="text-[15px] font-semibold text-[#0D0D0D] tracking-[-0.01em]">SimulaPool</span>
            </Link>
            {/* Online status — desktop only */}
            <div className="hidden md:flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-[pulse-dot_2s_ease-in-out_infinite]" />
              <span className="text-[12px] font-medium text-[#16A34A]">Sistema online</span>
            </div>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              to="/lojista"
              className={`text-[13px] transition-all duration-150 ${
                location.pathname === "/lojista"
                  ? "text-[#0D0D0D] font-medium"
                  : "text-[#6B7280] hover:text-[#0D0D0D]"
              }`}
            >
              Para Lojistas
            </Link>
            <button
              onClick={onSimulate}
              className="h-9 px-5 text-[13px] font-medium rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white transition-all duration-150"
            >
              Ver Preços →
            </button>
          </div>

          {/* Mobile: CTA button always visible */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={onSimulate}
              className="h-9 px-4 text-[13px] font-medium rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white transition-all duration-150"
            >
              Ver Preços →
            </button>
          </div>
        </div>
      </nav>
    </>
  );
};

export default SiteHeader;
