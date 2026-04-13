import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import * as Sentry from "@sentry/react";
import App from "./App.tsx";
import "./index.css";

// ── Sentry error monitoring ──
Sentry.init({
  dsn: "https://46c7c3d4feccd13f9e5a41fa97cb96d5@o4511214197473280.ingest.us.sentry.io/4511214214381568",
  environment: import.meta.env.MODE,
  enabled: import.meta.env.PROD,
  tracesSampleRate: 0.2,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
  beforeSend(event) {
    if (event.request?.headers) {
      delete event.request.headers["Authorization"];
    }
    return event;
  },
});

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
} else {
  // Auto-update: recarrega quando nova versão estiver disponível
  registerSW({
    onNeedRefresh() {
      window.location.reload();
    },
    onOfflineReady() {
      console.log("App pronto para uso offline");
    },
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      setInterval(() => registration.update(), 5 * 60 * 1000);
    });
  }
}

// ── Passive touch listeners for smoother scrolling ──
document.addEventListener("touchstart", () => {}, { passive: true });
document.addEventListener("touchmove", () => {}, { passive: true });

createRoot(document.getElementById("root")!).render(<App />);
