import { useEffect } from "react";
import logoIcon from "@/assets/logo-icon-v3.webp";

const LINKS = [
  {
    label: "Simular minha piscina",
    desc: "Monte seu orçamento em minutos",
    href: "/",
    color: "rgba(26,127,212,0.2)",
    icon: "🏊",
    cls: "btn-consumidor",
  },
  {
    label: "Sou Lojista",
    desc: "Conheça a plataforma para sua loja",
    href: "/lojista",
    color: "rgba(14,138,116,0.2)",
    icon: "🏪",
    cls: "btn-lojista",
  },
  {
    label: "Parceiros",
    desc: "Marcas e fabricantes parceiros",
    href: "/parceiros",
    color: "rgba(217,124,16,0.2)",
    icon: "🤝",
    cls: "btn-parceiros",
  },
];

const Links = () => {
  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => document.documentElement.classList.remove("dark");
  }, []);

  return (
    <>
      <style>{`
        .links-page {
          font-family: 'DM Sans', sans-serif;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0a1628;
          position: relative;
          overflow: hidden;
        }
        .links-page::before {
          content: '';
          position: fixed;
          width: 600px; height: 600px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(26,127,212,0.12) 0%, transparent 70%);
          top: -150px; left: -150px;
          pointer-events: none;
        }
        .links-page::after {
          content: '';
          position: fixed;
          width: 500px; height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(14,138,116,0.10) 0%, transparent 70%);
          bottom: -100px; right: -100px;
          pointer-events: none;
        }
        .links-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 400px;
          padding: 40px 28px 36px;
          text-align: center;
        }
        .links-logo {
          width: 72px; height: 72px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid rgba(255,255,255,0.15);
          animation: links-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) both;
        }
        @keyframes links-pop {
          from { transform: scale(0.5); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
        @keyframes links-fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .links-brand {
          font-family: 'Sora', 'Montserrat', sans-serif;
          font-size: 26px; font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.02em;
          animation: links-fadeUp 0.5s 0.1s ease both;
        }
        .links-tag {
          font-size: 11px; font-weight: 500;
          color: rgba(255,255,255,0.4);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 32px;
          animation: links-fadeUp 0.5s 0.2s ease both;
        }
        .links-btn {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px 20px;
          border-radius: 14px;
          text-decoration: none;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.05);
          backdrop-filter: blur(10px);
          transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease;
          cursor: pointer;
          text-align: left;
          animation: links-fadeUp 0.5s ease both;
          color: inherit;
        }
        .links-btn:hover {
          transform: translateY(-2px);
          background: rgba(255,255,255,0.1);
          border-color: rgba(255,255,255,0.2);
        }
        .links-btn:active { transform: scale(0.98); }
        .links-btn:nth-child(1) { animation-delay: 0.25s; }
        .links-btn:nth-child(2) { animation-delay: 0.35s; }
        .links-btn:nth-child(3) { animation-delay: 0.45s; }
        .links-btn-icon {
          width: 42px; height: 42px;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
        }
        .links-btn-label {
          font-family: 'Sora', 'Montserrat', sans-serif;
          font-size: 14px; font-weight: 700;
          color: #ffffff;
          display: block; margin-bottom: 2px;
        }
        .links-btn-desc {
          font-size: 11px;
          color: rgba(255,255,255,0.45);
          line-height: 1.4;
        }
        .links-btn-arrow {
          color: rgba(255,255,255,0.3);
          font-size: 18px;
          flex-shrink: 0;
        }
        .links-divider {
          height: 1px;
          background: rgba(255,255,255,0.06);
          margin: 24px 0 20px;
          animation: links-fadeUp 0.5s 0.5s ease both;
        }
        .links-footer {
          font-size: 10px;
          color: rgba(255,255,255,0.2);
          animation: links-fadeUp 0.5s 0.55s ease both;
          letter-spacing: 0.08em;
        }
      `}</style>

      <div className="links-page">
        <div className="links-card">
          <div className="flex flex-col items-center gap-2.5 mb-1.5">
            <img src={logoIcon} alt="SimulaPool" className="links-logo" />
            <span className="links-brand">SimulaPool</span>
            <span className="links-tag">Orçamentos em Minutos</span>
          </div>

          <div className="flex flex-col gap-3">
            {LINKS.map((link) => (
              <a key={link.cls} href={link.href} className={`links-btn ${link.cls}`}>
                <span className="links-btn-icon" style={{ background: link.color }}>
                  {link.icon}
                </span>
                <span className="flex-1">
                  <span className="links-btn-label">{link.label}</span>
                  <span className="links-btn-desc">{link.desc}</span>
                </span>
                <span className="links-btn-arrow">›</span>
              </a>
            ))}
          </div>

        </div>
      </div>
    </>
  );
};

export default Links;
