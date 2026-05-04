import { useEffect } from "react";

/**
 * Prefetch dos chunks principais quando o navegador estiver ocioso.
 * Reduz latência de navegação (Login → Admin/Matriz, Index → Login).
 * Respeita Save-Data e conexões 2g.
 */
export function useRoutePrefetch() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const conn = (navigator as any).connection;
    if (conn?.saveData) return;
    if (conn?.effectiveType && /(^|-)2g$/.test(conn.effectiveType)) return;

    const idle = (cb: () => void) => {
      const w = window as any;
      if (typeof w.requestIdleCallback === "function") {
        w.requestIdleCallback(cb, { timeout: 2500 });
      } else {
        setTimeout(cb, 1500);
      }
    };

    const path = window.location.pathname;

    idle(() => {
      // Sempre pré-carregar Login (entrada mais comum)
      import("@/pages/Login").catch(() => {});

      if (path === "/" || path.startsWith("/lojista") || path.startsWith("/parceiros")) {
        import("@/pages/Auth").catch(() => {});
      }
      if (path.startsWith("/login") || path.startsWith("/admin")) {
        import("@/pages/Admin").catch(() => {});
      }
      if (path.startsWith("/loginmatriz") || path.startsWith("/matriz")) {
        import("@/pages/Matriz").catch(() => {});
      }
    });
  }, []);
}
