import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoHorizontal from "@/assets/simulapool-horizontal.png";

const navLinks = [
  { label: "Planos", to: "/lojista" },
];

const LojistaHeader = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [entered, setEntered] = useState(false);
  const location = useLocation();
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) { setEntered(true); return; }
    const timer = setTimeout(() => setEntered(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <div className="h-3 bg-white w-full md:hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }} />
      <nav ref={navRef} className="sticky top-0 z-50 border-b border-border/30 bg-white backdrop-blur-md">
        <div className="container mx-auto md:px-4 flex justify-between items-center px-[14px] py-px">
          <Link
            to="/lojista"
            className="transition-all duration-500 ease-out"
            style={{ opacity: entered ? 1 : 0, transform: entered ? 'translateX(0)' : 'translateX(-40px)' }}
          >
            <img src={logoHorizontal} alt="SIMULAPOOL" className="h-16 md:h-16 object-contain" />
          </Link>

          <div
            className="hidden md:flex items-center gap-10 pb-0.5 transition-all duration-500 ease-out"
            style={{ opacity: entered ? 1 : 0, transform: entered ? 'translateX(0)' : 'translateX(40px)', transitionDelay: '100ms' }}
          >
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-medium transition-colors ${
                  location.pathname === link.to ? "text-primary font-semibold" : "text-primary hover:text-primary/80"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button size="sm" variant="outline" className="font-display font-semibold border-primary text-primary hover:bg-primary hover:text-white transition-all px-5">
                  Entrar
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="sm" className="gradient-primary text-white font-display font-semibold shadow-sm px-5">
                  Criar Loja Grátis
                </Button>
              </Link>
            </div>
          </div>

          <button
            className="md:hidden min-w-[56px] min-h-[56px] flex items-center justify-center -mr-2 touch-manipulation active:bg-muted/50 rounded-xl transition-all duration-500 ease-out"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu"
            style={{ opacity: entered ? 1 : 0, transform: entered ? 'translateX(0)' : 'translateX(40px)' }}
          >
            {mobileMenuOpen ? <X className="w-8 h-8" /> : <Menu className="w-8 h-8" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border/30 bg-background/98 backdrop-blur-md px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                className="block text-base font-medium py-3 px-2 rounded-lg active:bg-muted transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div className="flex gap-3 pt-2">
              <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="flex-1">
                <Button size="lg" variant="outline" className="w-full font-display font-semibold text-base border-primary text-primary">
                  Entrar
                </Button>
              </Link>
              <Link to="/auth" onClick={() => setMobileMenuOpen(false)} className="flex-1">
                <Button size="lg" className="w-full gradient-primary text-white font-display font-semibold text-base">
                  Criar Loja Grátis
                </Button>
              </Link>
            </div>
          </div>
        )}
      </nav>
    </>
  );
};

export default LojistaHeader;
