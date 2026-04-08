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

      <nav className="sticky top-0 z-50 h-14 md:h-[68px]" style={{ backgroundColor: '#0F172A' }}>
        <div className="container mx-auto px-5 md:px-12 h-full flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoIcon} alt="SimulaPool" className="w-8 h-8 rounded-lg" />
            <span className="text-[18px] font-bold text-white tracking-[-0.01em]">SimulaPool</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-9">
            {/* Sistema online dot */}
            <span className="flex items-center gap-2 text-[12px] font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: '#38BDF8' }} />
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: '#38BDF8' }} />
              </span>
              Sistema online
            </span>
            <Link
              to="/parceiros"
              className="text-[15px] font-medium transition-colors duration-200"
              style={{
                color: location.pathname === "/parceiros" ? '#FFFFFF' : 'rgba(255,255,255,0.7)',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#FFFFFF'; }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color =
                  location.pathname === "/parceiros" ? '#FFFFFF' : 'rgba(255,255,255,0.7)';
              }}
            >
              Parceiros
            </Link>
            <button
              onClick={onSimulate}
              className="h-10 px-6 text-[15px] font-semibold rounded-lg text-white transition-all duration-150"
              style={{ backgroundColor: '#0EA5E9' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#0284C7'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#0EA5E9'; }}
            >
              Ver Preços →
            </button>
          </div>

          {/* Mobile: CTA button always visible */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={onSimulate}
              className="h-9 px-4 text-[13px] font-medium rounded-lg text-white transition-all duration-150"
              style={{ backgroundColor: '#0EA5E9' }}
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
