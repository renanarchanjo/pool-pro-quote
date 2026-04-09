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

    // Phase 1: fade out
    setVisible(false);

    // Phase 2: swap content and fade in
    const swapTimer = setTimeout(() => {
      setDisplayChildren(children);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisible(true);
        });
      });
    }, 120);

    return () => clearTimeout(swapTimer);
  }, [location.pathname, children]);

  return (
    <div
      className="h-full"
      style={{
        opacity: visible ? 1 : 0,
        transition: visible
          ? "opacity 0.2s ease-out"
          : "opacity 0.1s ease-in",
      }}
    >
      {displayChildren}
    </div>
  );
};

export default PageTransition;
