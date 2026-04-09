import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import logoIcon from "@/assets/logo-icon-v2.png";
import { ArrowLeft, Menu, X } from "lucide-react";

interface SiteHeaderProps {
  onSimulate?: () => void;
}

const SiteHeader = ({ onSimulate }: SiteHeaderProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === "/";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logoIcon} alt="SimulaPool" className="h-10 md:h-14 w-auto" />
            <div className="flex flex-col">
              <span className="text-[20px] md:text-[26px] font-bold text-white tracking-[-0.01em] leading-tight">
                <span>Simula</span><span className="bg-gradient-to-r from-sky-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent drop-shadow-sm">Pool</span>
              </span>
              <span className="text-[8px] md:text-[9px] font-medium tracking-[0.08em] uppercase text-white/50 leading-tight">Orçamentos em Minutos!</span>
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

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex md:hidden items-center justify-center w-9 h-9 rounded-full text-white/80 transition-all duration-200"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            {mobileMenuOpen ? <X className="w-[18px] h-[18px]" /> : <Menu className="w-[18px] h-[18px]" />}
          </button>
        </div>
      </nav>

      {/* Mobile overlay menu */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 z-40"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Menu */}
          <div
            className="md:hidden absolute top-14 right-5 z-50 w-48 rounded-xl py-2 flex flex-col"
            style={{
              background: 'rgba(10,22,40,0.92)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}
          >
            {isHome && (
              <Link
                to="/parceiros"
                onClick={() => setMobileMenuOpen(false)}
                className="text-[14px] font-medium text-white/70 hover:text-white px-4 py-2.5 transition-colors"
              >
                Parceiros
              </Link>
            )}
            <button
              onClick={() => { handleCtaClick(); setMobileMenuOpen(false); }}
              className="text-[14px] font-medium text-white/70 hover:text-white px-4 py-2.5 text-left transition-colors"
            >
              {isHome ? "Ver Preços" : "← Voltar"}
            </button>
          </div>
        </>
      )}
    </>
  );
};

export default SiteHeader;
