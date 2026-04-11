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
      className="h-full"
      style={{
        opacity: visible ? 1 : 0,
        transition: visible
          ? "opacity 0.12s ease-out"
          : "opacity 0.05s ease-in",
      }}
    >
      {displayChildren}
    </div>
  );
};

export default PageTransition;
