import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface FloatingPanelProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const FloatingPanel = ({ open, onClose, children }: FloatingPanelProps) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Prevent body scroll when open & auto-focus first element
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflowX = "hidden";
      document.body.scrollLeft = 0;
      document.documentElement.scrollLeft = 0;
      requestAnimationFrame(() => {
        const el = panelRef.current?.querySelector<HTMLElement>("button, a, [tabindex]");
        el?.focus();
      });
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflowX = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflowX = "";
    };
  }, [open]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] overflow-hidden pointer-events-none">
      {/* Overlay */}
      <div
        className={cn(
          "absolute inset-0 transition-all duration-250",
          open
            ? "bg-black/30 md:bg-transparent backdrop-blur-[2px] md:backdrop-blur-0 pointer-events-auto"
            : "bg-transparent backdrop-blur-0 pointer-events-none opacity-0"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          "absolute z-[61] flex flex-col",
          "right-3 md:right-5 left-auto",
          "top-1/2 -translate-y-1/2",
          "w-[min(280px,calc(100vw-24px))] md:w-[280px]",
          "max-h-[calc(100dvh-80px)]",
          "bg-background border border-border",
          "rounded-2xl",
          "shadow-[0_8px_40px_-12px_rgba(0,0,0,0.25),0_0_0_1px_rgba(0,0,0,0.04)]",
          "transition-all duration-250 ease-out",
          open
            ? "translate-x-0 opacity-100 scale-100 pointer-events-auto"
            : "translate-x-4 opacity-0 scale-95 pointer-events-none"
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="floating-panel-title"
      >
        <h2 id="floating-panel-title" className="sr-only">Menu de navegação</h2>
        <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain rounded-2xl">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default FloatingPanel;
