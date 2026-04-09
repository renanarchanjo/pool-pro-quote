import { Link } from "react-router-dom";
import logoIcon from "@/assets/logo-icon-v2.png";
import { User } from "lucide-react";

const LojistaHeader = () => {
  return (
    <>
      <div className="h-0 w-full md:hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }} />

      <nav className="sticky top-0 z-50 h-14 md:h-[68px] bg-transparent">
        <div className="container mx-auto px-5 md:px-12 h-full flex items-center justify-between">
          <Link to="/lojista" className="flex items-center gap-1.5">
            <img src={logoIcon} alt="SimulaPool" className="h-11 w-auto" />
            <span className="text-[22px] font-bold text-white tracking-[-0.01em] hidden sm:inline">SimulaPool</span>
          </Link>

          <div className="flex items-center gap-6 md:gap-8">
            {/* Planos e Preços — text link */}
            <Link
              to="/lojista/planos"
              className="text-[14px] font-medium transition-colors duration-200 hidden sm:inline-flex"
              style={{ color: 'rgba(255,255,255,0.6)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#FFFFFF'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)'; }}
            >
              Planos e Preços
            </Link>

            {/* Minha Conta — subtle pill */}
            <Link
              to="/login"
              className="h-9 md:h-10 px-4 md:px-5 text-[13px] md:text-[14px] font-medium rounded-full text-white/80 hover:text-white transition-all duration-200 inline-flex items-center gap-2 border border-white/15 hover:border-white/30 hover:bg-white/[0.06]"
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
