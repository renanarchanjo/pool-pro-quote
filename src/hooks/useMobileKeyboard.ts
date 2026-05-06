import { useEffect } from "react";

/**
 * Hook unificado de teclado virtual mobile.
 *  - Adiciona/remove a classe `keyboard-open` no <html>
 *  - Expõe altura do teclado em --kb-height
 *  - Faz scrollIntoView({block:"center"}) no campo focado (após teclado abrir)
 *  - Funciona em iOS Safari/Chrome e Android Chrome
 */
export function useMobileKeyboard() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    if (!isTouch) return;

    const root = document.documentElement;
    const vv = window.visualViewport;
    let raf = 0;

    const updateKb = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (!vv) return;
        const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
        root.style.setProperty("--kb-height", `${kb}px`);
        if (kb > 120) {
          root.classList.add("keyboard-open");
          root.dataset.kbOpen = "true";
        } else {
          root.classList.remove("keyboard-open");
          root.dataset.kbOpen = "false";
        }
      });
    };

    const onFocusIn = (e: FocusEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const tag = t.tagName;
      const editable =
        tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable;
      if (!editable) return;
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
      root.classList.remove("keyboard-open");
      root.dataset.kbOpen = "false";
    };

    vv?.addEventListener("resize", updateKb);
    vv?.addEventListener("scroll", updateKb);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    updateKb();

    return () => {
      cancelAnimationFrame(raf);
      vv?.removeEventListener("resize", updateKb);
      vv?.removeEventListener("scroll", updateKb);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      root.classList.remove("keyboard-open");
    };
  }, []);
}
