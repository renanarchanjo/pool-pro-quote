import { useEffect } from "react";

/**
 * Detecta abertura do teclado virtual (mobile) via VisualViewport
 * e adiciona/remove a classe `keyboard-open` no <html>.
 * O CSS global usa essa classe para esconder o bottom nav e remover paddings.
 */
export function useMobileKeyboard() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;

    const root = document.documentElement;
    let raf = 0;

    const handler = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const diff = window.innerHeight - vv.height;
        // Diferença > 150px geralmente indica teclado aberto
        if (diff > 150) root.classList.add("keyboard-open");
        else root.classList.remove("keyboard-open");
      });
    };

    vv.addEventListener("resize", handler);
    vv.addEventListener("scroll", handler);
    return () => {
      cancelAnimationFrame(raf);
      vv.removeEventListener("resize", handler);
      vv.removeEventListener("scroll", handler);
      root.classList.remove("keyboard-open");
    };
  }, []);
}
