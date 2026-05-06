import { useEffect } from "react";

/**
 * Hook global que melhora UX ao abrir/fechar teclado virtual mobile:
 *  - Expõe a altura do teclado em --kb-height (CSS var)
 *  - Garante que o input/textarea focado fique visível (scrollIntoView)
 *  - Funciona em iOS Safari/Chrome e Android Chrome (visualViewport API)
 */
export function useMobileKeyboard() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    if (!isTouch) return;

    const root = document.documentElement;
    const vv = window.visualViewport;

    const updateKb = () => {
      if (!vv) return;
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      root.style.setProperty("--kb-height", `${kb}px`);
      root.dataset.kbOpen = kb > 80 ? "true" : "false";
    };

    const onFocusIn = (e: FocusEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const tag = t.tagName;
      const editable =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        t.isContentEditable;
      if (!editable) return;
      // Aguarda teclado abrir antes de centralizar
      window.setTimeout(() => {
        try {
          t.scrollIntoView({ behavior: "smooth", block: "center" });
        } catch {
          /* noop */
        }
      }, 280);
    };

    const onFocusOut = () => {
      root.style.setProperty("--kb-height", "0px");
      root.dataset.kbOpen = "false";
    };

    vv?.addEventListener("resize", updateKb);
    vv?.addEventListener("scroll", updateKb);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    updateKb();

    return () => {
      vv?.removeEventListener("resize", updateKb);
      vv?.removeEventListener("scroll", updateKb);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);
}
