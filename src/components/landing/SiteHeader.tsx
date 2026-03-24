import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoHorizontal from "@/assets/simulapool-horizontal.png";

const navLinks = [
  { label: "Simular Agora!", to: "/" },
  { label: "Parceiros", to: "/parceiros" },
];

const SiteHeader = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <>
      {/* Top utility bar for mobile touch area */}
      <div className="h-2 bg-primary/80 w-full" />
      
      <nav className="sticky top-0 z-50 border-b border-border/30 bg-white backdrop-blur-md">
        <div className="container mx-auto px-3 pt-6 pb-2 md:px-4 md:py-3 flex justify-between items-end">
          <Link to="/">
            <img src={logoHorizontal} alt="SIMULAPOOL" className="h-12 md:h-12 object-contain" />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-10 pb-0.5">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-medium transition-colors ${
                  location.pathname === link.to
                    ? "text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link to="/auth">
              <Button size="sm" className="gradient-primary text-white font-display font-semibold shadow-sm">
                Área do Lojista
              </Button>
            </Link>
          </div>

          {/* Mobile Toggle */}
          <button
            className="md:hidden p-2.5 -mr-2 -mb-0.5 touch-manipulation"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
          </button>
        </div>

        {/* Mobile Nav */}
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
            <Link to="/auth" onClick={() => setMobileMenuOpen(false)} className="block pt-2">
              <Button size="lg" className="w-full gradient-primary text-white font-display font-semibold text-base">
                Área do Lojista
              </Button>
            </Link>
          </div>
        )}
      </nav>
    </>
  );
};

export default SiteHeader;
