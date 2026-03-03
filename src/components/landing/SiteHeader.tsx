import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoHorizontal from "@/assets/simulapool-horizontal.png";

const navLinks = [
  { label: "Apresentação", to: "/" },
  { label: "Preços", to: "/precos" },
  { label: "Parceiros", to: "/parceiros" },
];

const SiteHeader = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <nav className="sticky top-0 z-50 bg-[hsl(220,40%,13%)] border-b border-white/10">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link to="/">
          <img src={logoHorizontal} alt="SIMULAPOOL" className="h-9 object-contain brightness-0 invert" />
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-10">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm font-medium transition-colors ${
                location.pathname === link.to
                  ? "text-white"
                  : "text-white/60 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link to="/auth">
            <Button
              size="sm"
              className="bg-[hsl(160,70%,45%)] hover:bg-[hsl(160,70%,40%)] text-white font-display font-semibold rounded-full px-6"
            >
              Área do Lojista
            </Button>
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden p-2 text-white"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Nav */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[hsl(220,40%,13%)] border-t border-white/10 px-4 py-4 space-y-3">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-white/80 hover:text-white py-2"
            >
              {link.label}
            </Link>
          ))}
          <Link to="/auth" onClick={() => setMobileMenuOpen(false)} className="block">
            <Button
              size="sm"
              className="w-full bg-[hsl(160,70%,45%)] hover:bg-[hsl(160,70%,40%)] text-white font-display font-semibold rounded-full"
            >
              Área do Lojista
            </Button>
          </Link>
        </div>
      )}
    </nav>
  );
};

export default SiteHeader;
