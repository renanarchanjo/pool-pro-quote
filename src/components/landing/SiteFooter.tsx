import { Link } from "react-router-dom";

const SiteFooter = () => (
  <footer className="py-8 bg-background border-t border-border">
    <div className="container mx-auto px-4 flex flex-col items-center gap-3 text-center">
      <div className="flex items-center gap-5 text-[13px] text-muted-foreground">
        <Link to="/parceiros" className="hover:text-foreground transition-colors duration-200">
          Parceiros
        </Link>
        <a href="mailto:simulapool@gmail.com" className="hover:text-foreground transition-colors duration-200">
          Contato
        </a>
      </div>
      <p className="text-[13px] text-muted-foreground">
        © 2026 SimulaPool
      </p>
    </div>
  </footer>
);

export default SiteFooter;
