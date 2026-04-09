import { Link } from "react-router-dom";

const SiteFooter = () => (
  <footer className="py-8 border-t border-border" role="contentinfo">
    <div className="container mx-auto px-4 flex flex-col items-center gap-3 text-center">
      <nav aria-label="Links do rodapé" className="flex items-center gap-5 text-[13px] text-muted-foreground">
        <Link to="/parceiros" className="hover:text-foreground transition-colors duration-200">
          Parceiros
        </Link>
        <a href="mailto:simulapool@gmail.com" className="hover:text-foreground transition-colors duration-200">
          Contato
        </a>
      </nav>
      <p className="text-[13px] text-muted-foreground">
        © {new Date().getFullYear()} SimulaPool
      </p>
    </div>
  </footer>
);

export default SiteFooter;
