import { Link } from "react-router-dom";

const SiteFooter = () => {
  return (
    <footer className="py-6 bg-[#FFFFFF]">
      <div className="container mx-auto px-4 text-center">
        <p className="text-[13px] text-[#9CA3AF]">
          © 2026 SimulaPool ·{" "}
          <Link to="/lojista" className="hover:text-[#6B7280] transition-colors">
            Para lojistas
          </Link>{" "}
          ·{" "}
          <a href="mailto:contato@simulapool.com" className="hover:text-[#6B7280] transition-colors">
            Contato
          </a>
        </p>
      </div>
    </footer>
  );
};

export default SiteFooter;
