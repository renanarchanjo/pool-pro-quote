import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";

interface PageTransitionProps {
  children: React.ReactNode;
}

const PageTransition = ({ children }: PageTransitionProps) => {
  const location = useLocation();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [visible, setVisible] = useState(true);
  const prevPathRef = useRef(location.pathname);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      setDisplayChildren(children);
      return;
    }

    if (prevPathRef.current === location.pathname) {
      setDisplayChildren(children);
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      prevPathRef.current = location.pathname;
      setDisplayChildren(children);
      return;
    }

    prevPathRef.current = location.pathname;

    // Instant swap with minimal fade — no blocking delay
    setVisible(false);
    // Use rAF for near-instant swap instead of setTimeout
    requestAnimationFrame(() => {
      setDisplayChildren(children);
      requestAnimationFrame(() => {
        setVisible(true);
      });
    });
  }, [location.pathname, children]);

  return (
    <div
      key={prevPathRef.current}
      className="h-full"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(8px)",
        transition: visible
          ? "opacity 180ms cubic-bezier(0.22, 1, 0.36, 1), transform 220ms cubic-bezier(0.22, 1, 0.36, 1)"
          : "opacity 80ms ease-in, transform 80ms ease-in",
      }}
    >
      {displayChildren}
    </div>
  );
};

export default PageTransition;
