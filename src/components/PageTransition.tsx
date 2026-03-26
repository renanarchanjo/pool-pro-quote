import { useEffect, useState, useRef, useCallback } from "react";
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
    // Skip animation on first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      setDisplayChildren(children);
      return;
    }

    if (prevPathRef.current === location.pathname) {
      setDisplayChildren(children);
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      prevPathRef.current = location.pathname;
      setDisplayChildren(children);
      return;
    }

    prevPathRef.current = location.pathname;

    // Phase 1: fade out current page quickly
    setVisible(false);

    // Phase 2: swap content and fade in
    const swapTimer = setTimeout(() => {
      setDisplayChildren(children);
      // Force a reflow before animating in
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisible(true);
        });
      });
    }, 150); // Short exit duration

    return () => clearTimeout(swapTimer);
  }, [location.pathname, children]);

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(20px)",
        transition: visible
          ? "opacity 0.3s ease-out, transform 0.3s ease-out"
          : "opacity 0.12s ease-in, transform 0.12s ease-in",
      }}
    >
      {displayChildren}
    </div>
  );
};

export default PageTransition;
