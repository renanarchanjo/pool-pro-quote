import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// ── Dynamic viewport height (fixes mobile browser bar) ──
function setAppVh() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty("--app-vh", `${vh}px`);
}
setAppVh();
window.addEventListener("resize", setAppVh, { passive: true });

// ── Detect virtual keyboard open/close ──
if ("visualViewport" in window && window.visualViewport) {
  const vv = window.visualViewport;
  const onResize = () => {
    const keyboardOpen = vv.height < window.innerHeight * 0.75;
    document.body.classList.toggle("keyboard-open", keyboardOpen);
  };
  vv.addEventListener("resize", onResize, { passive: true });
}

// ── PWA: unregister service workers in iframe/preview context ──
const isInIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if (isPreviewHost || isInIframe) {
  navigator.serviceWorker?.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });
} else if ("serviceWorker" in navigator) {
  navigator.serviceWorker.ready.then((registration) => {
    setInterval(() => registration.update(), 5 * 60 * 1000);
  });
}

// ── Passive touch listeners for smoother scrolling ──
document.addEventListener("touchstart", () => {}, { passive: true });
document.addEventListener("touchmove", () => {}, { passive: true });

// ── DevTools detection (production only) ──
if (import.meta.env.PROD) {
  const devtools = { open: false };
  const threshold = 160;

  setInterval(() => {
    if (
      window.outerWidth - window.innerWidth > threshold ||
      window.outerHeight - window.innerHeight > threshold
    ) {
      if (!devtools.open) {
        devtools.open = true;
        import("@/integrations/supabase/client").then(({ supabase }) => {
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
              console.clear();
            }
          });
        });
      }
    } else {
      devtools.open = false;
    }
  }, 500);
}

createRoot(document.getElementById("root")!).render(<App />);
