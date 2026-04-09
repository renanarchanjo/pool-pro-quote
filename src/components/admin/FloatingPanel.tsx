import { useEffect, useRef } from "react";
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

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-[60] transition-all duration-250",
          open
            ? "bg-black/30 backdrop-blur-[2px] pointer-events-auto"
            : "bg-transparent backdrop-blur-0 pointer-events-none opacity-0"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          "fixed z-[61] flex flex-col",
          "right-3 md:right-5",
          "top-1/2 -translate-y-1/2",
          "w-[85vw] max-w-[360px] md:w-[340px]",
          "max-h-[calc(100dvh-80px)]",
          "bg-background border border-border",
          "rounded-2xl",
          "shadow-[0_8px_40px_-12px_rgba(0,0,0,0.25),0_0_0_1px_rgba(0,0,0,0.04)]",
          "transition-all duration-250 ease-out",
          open
            ? "translate-x-0 opacity-100 scale-100 pointer-events-auto"
            : "translate-x-[120%] opacity-0 scale-95 pointer-events-none"
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain rounded-2xl">
          {children}
        </div>
      </div>
    </>
  );
};

export default FloatingPanel;
