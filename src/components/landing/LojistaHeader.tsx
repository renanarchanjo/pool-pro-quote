import { Link } from "react-router-dom";
import logoIcon from "@/assets/logo-icon.png";
import { User, CreditCard } from "lucide-react";

const LojistaHeader = () => {
  return (
    <>
      <div className="h-0 w-full md:hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }} />

      <nav className="sticky top-0 z-50 h-14 md:h-[68px] bg-transparent">
        <div className="container mx-auto px-5 md:px-12 h-full flex items-center justify-between">
          <Link to="/lojista" className="flex items-center gap-2">
            <img src={logoIcon} alt="SimulaPool" className="h-11 w-auto" />
            <span className="text-[22px] font-bold text-white tracking-[-0.01em] hidden sm:inline">SimulaPool</span>
          </Link>

          {/* Central: Planos e Preços */}
          <Link
            to="/lojista/planos"
            className="h-10 px-5 text-[13px] md:text-[14px] font-semibold rounded-lg text-white transition-all duration-150 inline-flex items-center gap-2"
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.2)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)'; }}
          >
            <CreditCard className="w-4 h-4" /> Planos e Preços
          </Link>

          {/* Minha Conta */}
          <Link
            to="/login"
            className="h-10 px-4 md:px-5 text-[13px] md:text-[14px] font-semibold rounded-lg text-white transition-all duration-150 inline-flex items-center gap-2"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.15)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; }}
          >
            <User className="w-4 h-4" /> <span className="hidden sm:inline">Minha Conta</span>
          </Link>
        </div>
      </nav>
    </>
  );
};

export default LojistaHeader;
