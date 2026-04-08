import { Link } from "react-router-dom";
import logoIcon from "@/assets/logo-icon.png";
import { User } from "lucide-react";

const LojistaHeader = () => {
  return (
    <>
      <div className="h-0 w-full md:hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }} />

      <nav className="sticky top-0 z-50 h-14 md:h-[68px] bg-transparent">
        <div className="container mx-auto px-5 md:px-12 h-full flex items-center justify-between">
          <Link to="/lojista" className="flex items-center gap-2">
            <img src={logoIcon} alt="SimulaPool" className="h-11 w-auto" />
            <span className="text-[22px] font-bold text-white tracking-[-0.01em]">SimulaPool</span>
          </Link>

          {/* Desktop */}
          <div className="hidden md:flex items-center gap-9">
            <a
              href="#planos"
              className="text-[15px] font-medium transition-colors duration-200"
              style={{ color: 'rgba(255,255,255,0.65)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#FFFFFF'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.65)'; }}
            >
              Planos e Preços
            </a>
            <Link
              to="/login"
              className="h-10 px-5 text-[14px] font-semibold rounded-lg text-white transition-all duration-150 inline-flex items-center gap-2"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.2)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)'; }}
            >
              <User className="w-4 h-4" /> Minha Conta
            </Link>
          </div>

          {/* Mobile */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              to="/login"
              className="h-9 px-4 text-[13px] font-medium rounded-lg text-white transition-all duration-150 inline-flex items-center gap-1.5"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              <User className="w-3.5 h-3.5" /> Minha Conta
            </Link>
          </div>
        </div>
      </nav>
    </>
  );
};

export default LojistaHeader;
