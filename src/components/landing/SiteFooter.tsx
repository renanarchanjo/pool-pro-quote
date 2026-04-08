import { Link } from "react-router-dom";

const SiteFooter = () => (
  <footer className="py-8 bg-background border-t border-border">
    <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
      <p className="text-[13px] text-muted-foreground">
        © 2026 SimulaPool
      </p>
      <div className="flex items-center gap-5 text-[13px] text-muted-foreground">
        <Link to="/lojista" className="hover:text-foreground transition-colors duration-200">
          Para lojistas
        </Link>
        <Link to="/parceiros" className="hover:text-foreground transition-colors duration-200">
          Parceiros
        </Link>
        <a href="mailto:contato@simulapool.com" className="hover:text-foreground transition-colors duration-200">
          Contato
        </a>
      </div>
    </div>
  </footer>
);

export default SiteFooter;
