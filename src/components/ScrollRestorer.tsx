import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const STORAGE_KEY = "persist::scroll";

type ScrollMap = Record<string, number>;

const readMap = (): ScrollMap => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ScrollMap) : {};
  } catch {
    return {};
  }
};

const writeMap = (map: ScrollMap) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
};

/**
 * Saves window scroll position per pathname into sessionStorage and
 * restores it on reload / back navigation. New PUSH navigations scroll to top.
 *
 * Mounted once inside <BrowserRouter>.
 */
const ScrollRestorer = () => {
  const { pathname } = useLocation();
  const navType = useNavigationType(); // POP | PUSH | REPLACE
  const lastPath = useRef<string | null>(null);

  // Disable browser's own scroll restoration so we own the behaviour.
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      const prev = window.history.scrollRestoration;
      window.history.scrollRestoration = "manual";
      return () => {
        window.history.scrollRestoration = prev;
      };
    }
  }, []);

  // Restore (or reset) scroll on each route change AND on first mount (reload).
  useLayoutEffect(() => {
    const map = readMap();
    const saved = map[pathname];

    const shouldRestore = navType === "POP" || lastPath.current === null;

    if (shouldRestore && typeof saved === "number") {
      // Defer to after paint so the page has its content laid out.
      const restore = () => window.scrollTo(0, saved);
      restore();
      // Some pages render async; retry briefly.
      const timers = [80, 200, 500, 1000].map((ms) => window.setTimeout(restore, ms));
      lastPath.current = pathname;
      return () => timers.forEach(clearTimeout);
    }

    if (navType === "PUSH") {
      window.scrollTo(0, 0);
    }
    lastPath.current = pathname;
  }, [pathname, navType]);

  // Continuously persist current scroll for the active path.
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const map = readMap();
        map[pathname] = window.scrollY;
        writeMap(map);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("beforeunload", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("beforeunload", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [pathname]);

  return null;
};

export default ScrollRestorer;
