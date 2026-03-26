import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";

interface PageTransitionProps {
  children: React.ReactNode;
}

const PageTransition = ({ children }: PageTransitionProps) => {
  const location = useLocation();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [phase, setPhase] = useState<"enter" | "idle">("idle");
  const prevPathRef = useRef(location.pathname);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion || prevPathRef.current === location.pathname) {
      setDisplayChildren(children);
      return;
    }

    prevPathRef.current = location.pathname;
    
    // Immediately swap content and animate in
    setDisplayChildren(children);
    setPhase("enter");

    const timer = setTimeout(() => setPhase("idle"), 400);
    return () => clearTimeout(timer);
  }, [location.pathname, children]);

  return (
    <div
      style={{
        opacity: phase === "enter" ? 0 : 1,
        transform: phase === "enter" ? "translateX(30px)" : "translateX(0)",
        transition: "opacity 0.35s ease-out, transform 0.35s ease-out",
        willChange: phase === "enter" ? "opacity, transform" : "auto",
      }}
    >
      {displayChildren}
    </div>
  );
};

export default PageTransition;
