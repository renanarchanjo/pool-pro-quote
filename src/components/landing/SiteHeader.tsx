import { Link, useLocation, useNavigate } from "react-router-dom";
import logoIcon from "@/assets/logo-icon-v2.png";
import { ArrowLeft } from "lucide-react";

interface SiteHeaderProps {
  onSimulate?: () => void;
}

const SiteHeader = ({ onSimulate }: SiteHeaderProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === "/";

  const handleCtaClick = () => {
    if (isHome && onSimulate) {
      onSimulate();
    } else {
      navigate("/");
    }
  };

  return (
    <>
      <div className="h-0 w-full md:hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }} />

      <nav className="sticky top-0 z-50 h-14 md:h-[68px] bg-transparent">
        <div className="container mx-auto px-5 md:px-12 h-full flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoIcon} alt="SimulaPool" className="h-14 w-auto" />
            <div className="flex flex-col">
              <span className="text-[26px] font-bold text-white tracking-[-0.01em] leading-tight">
                <span>Simula</span><span className="bg-gradient-to-r from-sky-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent drop-shadow-sm">Pool</span>
              </span>
              <span className="text-[9px] font-medium tracking-[0.08em] uppercase text-white/50 leading-tight">Orçamentos em Minutos!</span>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-9">
            {isHome && (
              <Link
                to="/parceiros"
                className="text-[15px] font-medium transition-colors duration-200"
                style={{ color: 'rgba(255,255,255,0.65)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#FFFFFF'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.65)'; }}
              >
                Parceiros
              </Link>
            )}
            <button
              onClick={handleCtaClick}
              className="h-10 px-5 text-[14px] font-semibold rounded-lg text-white transition-all duration-150 inline-flex items-center gap-2"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.2)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)'; }}
            >
              {isHome ? (
                <>Ver Preços →</>
              ) : (
                <><ArrowLeft className="w-4 h-4" /> Voltar</>
              )}
            </button>
          </div>

          {/* Mobile */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={handleCtaClick}
              className="h-9 px-4 text-[13px] font-medium rounded-lg text-white transition-all duration-150 inline-flex items-center gap-1.5"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              {isHome ? (
                <>Ver Preços →</>
              ) : (
                <><ArrowLeft className="w-3.5 h-3.5" /> Voltar</>
              )}
            </button>
          </div>
        </div>
      </nav>
    </>
  );
};

export default SiteHeader;
