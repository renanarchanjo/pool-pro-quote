import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";

interface SiteHeaderProps {
  onSimulate?: () => void;
}

const SiteHeader = ({ onSimulate }: SiteHeaderProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <>
      <div className="h-0 w-full md:hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }} />

      <nav className="sticky top-0 z-50 bg-[#FFFFFF] border-b border-[#E5E7EB] h-14">
        <div className="container mx-auto px-4 h-full flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <span className="text-[15px] font-semibold text-[#0D0D0D] tracking-[-0.01em]">SimulaPool</span>
            <span className="w-1.5 h-1.5 rounded-full bg-primary ml-0.5 mb-2" />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              to="/parceiros"
              className={`text-[13px] transition-all duration-150 ${
                location.pathname === "/parceiros"
                  ? "text-[#0D0D0D] font-medium"
                  : "text-[#6B7280] hover:text-[#0D0D0D]"
              }`}
            >
              Parceiros
            </Link>
            <button
              onClick={onSimulate}
              className="h-9 px-5 text-[13px] font-medium rounded-lg bg-primary hover:bg-[#0284C7] text-white transition-all duration-150"
            >
              Simular Agora
            </button>
          </div>

          {/* Mobile: CTA button always visible + hamburger for menu */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={onSimulate}
              className="h-9 px-4 text-[13px] font-medium rounded-lg bg-primary hover:bg-[#0284C7] text-white transition-all duration-150"
            >
              Simular Agora
            </button>
          </div>
        </div>
      </nav>
    </>
  );
};

export default SiteHeader;
