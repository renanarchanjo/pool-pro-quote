import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// ── PWA Auto-Update: detect new service worker and reload automatically ──
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.ready.then((registration) => {
    // Check for updates every 60 seconds
    setInterval(() => {
      registration.update();
    }, 60 * 1000);
  });

  // When a new SW is installed and controlling the page, reload
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
