import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// ── PWA: check for updates periodically, but do NOT auto-reload ──
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.ready.then((registration) => {
    // Check for updates every 5 minutes (not 60s — avoids churn)
    setInterval(() => {
      registration.update();
    }, 5 * 60 * 1000);
  });
}

createRoot(document.getElementById("root")!).render(<App />);
