import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoHorizontal from "@/assets/simulapool-horizontal.png";

const navLinks = [
  { label: "Simular Agora!", to: "/" },
  { label: "Preços", to: "/precos" },
  { label: "Parceiros", to: "/parceiros" },
];

const SiteHeader = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <nav className="sticky top-0 z-50 border-b border-border/30 bg-background/95 backdrop-blur-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link to="/">
          <img src={logoHorizontal} alt="SIMULAPOOL" className="h-10 object-contain" />
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-10">
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
          className="md:hidden p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Nav */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/30 bg-background/98 backdrop-blur-md px-4 py-4 space-y-3">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium py-2"
            >
              {link.label}
            </Link>
          ))}
          <Link to="/auth" onClick={() => setMobileMenuOpen(false)} className="block">
            <Button size="sm" className="w-full gradient-primary text-white font-display font-semibold">
              Área do Lojista
            </Button>
          </Link>
        </div>
      )}
    </nav>
  );
};

export default SiteHeader;
