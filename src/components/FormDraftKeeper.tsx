import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Global "draft" keeper for unsaved form fields.
 *
 * Opt-in per element: add `data-persist` (and ideally a stable `name`) to any
 * <input>, <textarea> or <select> whose value should survive a reload.
 *
 *   <input name="title" data-persist defaultValue="" />
 *
 * The key is `${pathname}::${name|id|data-persist}`.
 * Sensitive types (password / file / hidden / submit) are always skipped.
 */

const STORAGE_PREFIX = "persist::draft::";

const skip = (el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) => {
  if (!(el instanceof HTMLElement)) return true;
  if (!el.hasAttribute("data-persist")) return true;
  if (el instanceof HTMLInputElement) {
    if (["password", "file", "hidden", "submit", "button", "reset"].includes(el.type)) return true;
  }
  return false;
};

const fieldKey = (pathname: string, el: HTMLElement) => {
  const id =
    el.getAttribute("name") ||
    el.id ||
    el.getAttribute("data-persist") ||
    "";
  if (!id) return null;
  return `${STORAGE_PREFIX}${pathname}::${id}`;
};

const setNativeValue = (
  el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string,
) => {
  const proto =
    el instanceof HTMLInputElement
      ? HTMLInputElement.prototype
      : el instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLSelectElement.prototype;
  const desc = Object.getOwnPropertyDescriptor(proto, "value");
  desc?.set?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
};

const FormDraftKeeper = () => {
  const { pathname } = useLocation();

  // Save on every input/change.
  useEffect(() => {
    const onChange = (ev: Event) => {
      const el = ev.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      if (!el || skip(el)) return;
      const key = fieldKey(pathname, el);
      if (!key) return;
      try {
        if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
          sessionStorage.setItem(key, el.checked ? "1" : "0");
        } else {
          sessionStorage.setItem(key, el.value ?? "");
        }
      } catch {
        /* ignore quota */
      }
    };
    document.addEventListener("input", onChange, true);
    document.addEventListener("change", onChange, true);
    return () => {
      document.removeEventListener("input", onChange, true);
      document.removeEventListener("change", onChange, true);
    };
  }, [pathname]);

  // Restore on mount + when DOM grows (e.g. async rendered forms).
  useEffect(() => {
    const restored = new WeakSet<Element>();

    const restoreAll = () => {
      const nodes = document.querySelectorAll<HTMLElement>("[data-persist]");
      nodes.forEach((node) => {
        if (restored.has(node)) return;
        if (
          !(node instanceof HTMLInputElement) &&
          !(node instanceof HTMLTextAreaElement) &&
          !(node instanceof HTMLSelectElement)
        )
          return;
        if (skip(node)) return;
        const key = fieldKey(pathname, node);
        if (!key) return;
        const stored = sessionStorage.getItem(key);
        if (stored === null) return;
        try {
          if (
            node instanceof HTMLInputElement &&
            (node.type === "checkbox" || node.type === "radio")
          ) {
            const next = stored === "1";
            if (node.checked !== next) {
              node.checked = next;
              node.dispatchEvent(new Event("change", { bubbles: true }));
            }
          } else if (node.value !== stored) {
            setNativeValue(node, stored);
          }
          restored.add(node);
        } catch {
          /* ignore */
        }
      });
    };

    // Initial pass + a few retries while async UIs settle.
    restoreAll();
    const timers = [50, 200, 600, 1500].map((ms) => window.setTimeout(restoreAll, ms));

    const obs = new MutationObserver(() => restoreAll());
    obs.observe(document.body, { childList: true, subtree: true });

    return () => {
      timers.forEach(clearTimeout);
      obs.disconnect();
    };
  }, [pathname]);

  return null;
};

export default FormDraftKeeper;
