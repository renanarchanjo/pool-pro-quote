import { Loader2, ArrowDown } from "lucide-react";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { cn } from "@/lib/utils";

interface Props {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  className?: string;
  enabled?: boolean;
}

/**
 * Wrap any scrollable region. On pointer: coarse devices, dragging down past
 * the threshold triggers `onRefresh`.
 */
export default function PullToRefresh({ onRefresh, children, className, enabled = true }: Props) {
  const { ref, pull, refreshing, progress } = usePullToRefresh({ onRefresh, enabled });

  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} className={cn("relative overflow-y-auto h-full", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute left-0 right-0 top-0 z-10 flex items-center justify-center text-muted-foreground transition-opacity"
        style={{
          height: pull,
          opacity: pull > 4 ? 1 : 0,
          transform: refreshing ? "translateY(0)" : "translateY(0)",
        }}
      >
        {refreshing ? (
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        ) : (
          <ArrowDown
            className="w-5 h-5 text-primary transition-transform duration-200"
            style={{ transform: `rotate(${progress * 180}deg)`, opacity: 0.4 + progress * 0.6 }}
          />
        )}
      </div>
      <div
        style={{
          transform: `translateY(${refreshing ? 40 : pull}px)`,
          transition: pull === 0 || refreshing ? "transform 240ms cubic-bezier(0.22, 1, 0.36, 1)" : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}
