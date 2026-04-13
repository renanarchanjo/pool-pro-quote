import { useState, useEffect, useCallback } from "react";

function enableAnalytics() {
  // Placeholder: ativar scripts de analytics quando consentido
  console.log("[CookieBanner] Analytics habilitado");
}

const CookieBanner = () => {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie_consent");
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
    if (consent === "accepted") enableAnalytics();
  }, []);

  const dismiss = useCallback((accepted: boolean) => {
    setExiting(true);
    localStorage.setItem("cookie_consent", accepted ? "accepted" : "rejected");
    if (accepted) enableAnalytics();
    setTimeout(() => setVisible(false), 300);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookies & Privacidade"
      className="fixed z-50 bottom-6 right-6 max-w-[380px] rounded-xl p-5 px-6"
      style={{
        background: "#0F172A",
        border: "1px solid #1E293B",
        boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        animation: exiting
          ? "cookie-exit 300ms ease-out forwards"
          : "cookie-enter 400ms ease-out forwards",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base leading-none">🍪</span>
        <h2 className="text-sm font-bold text-white">Cookies &amp; Privacidade</h2>
      </div>

      <p className="text-xs leading-relaxed mb-4" style={{ color: "#94A3B8" }}>
        Usamos cookies para melhorar sua experiência e analisar o uso do sistema.
        Seus dados são tratados conforme a LGPD.{" "}
        <a
          href="/privacidade"
          className="underline hover:text-white transition-colors"
          style={{ color: "#0EA5E9" }}
        >
          Saiba mais
        </a>
      </p>

      <div className="flex gap-3">
        <button
          onClick={() => dismiss(false)}
          className="flex-1 rounded-lg py-2 px-4 text-[13px] font-medium transition-colors cursor-pointer"
          style={{
            border: "1px solid #334155",
            background: "transparent",
            color: "#94A3B8",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#1E293B")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          Recusar
        </button>
        <button
          onClick={() => dismiss(true)}
          className="flex-1 rounded-lg py-2 px-4 text-[13px] font-medium text-white transition-colors cursor-pointer"
          style={{ background: "#0EA5E9" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#0284C7")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#0EA5E9")}
        >
          Aceitar
        </button>
      </div>

      <style>{`
        @keyframes cookie-enter {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes cookie-exit {
          from { opacity: 1; transform: translateY(0); }
          to   { opacity: 0; transform: translateY(8px); }
        }
      `}</style>
    </div>
  );
};

export default CookieBanner;
