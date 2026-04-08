import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SiteHeaderProps {
  onSimulate?: () => void;
}

const SiteHeader = ({ onSimulate }: SiteHeaderProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <>
      <div className="h-0 w-full md:hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }} />

      <nav className="sticky top-0 z-50 bg-background border-b border-border h-14">
        <div className="container mx-auto px-4 h-full flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-0.5">
            <span className="text-base font-semibold text-foreground">Simula</span>
            <span className="text-base font-semibold text-foreground">Pool</span>
            <span className="w-1.5 h-1.5 rounded-full bg-primary ml-0.5 mb-2" />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              to="/parceiros"
              className={`text-sm transition-colors duration-150 ${
                location.pathname === "/parceiros"
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Parceiros
            </Link>
            <Button
              onClick={onSimulate}
              className="h-9 px-5 text-sm font-medium rounded-lg bg-primary hover:bg-[#0284C7] text-white transition-all duration-150"
            >
              Simular Agora
            </Button>
          </div>

          {/* Mobile Toggle */}
          <button
            className="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2 touch-manipulation"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background px-4 py-3 space-y-1">
            <Link
              to="/parceiros"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm py-3 px-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            >
              Parceiros
            </Link>
            <button
              onClick={() => { setMobileMenuOpen(false); onSimulate?.(); }}
              className="block w-full text-left text-sm py-3 px-2 rounded-lg text-primary font-medium"
            >
              Simular Agora
            </button>
          </div>
        )}
      </nav>
    </>
  );
};

export default SiteHeader;
