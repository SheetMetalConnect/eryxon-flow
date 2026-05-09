import { useRef, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHaptics } from "@/hooks/useHaptics";

interface PullToRefreshProps {
  /** Async refresh handler — pull is locked until the promise resolves. */
  onRefresh: () => Promise<unknown>;
  children: ReactNode;
  className?: string;
  /** Pixels of pull required before the refresh fires. */
  threshold?: number;
}

/**
 * iOS-feel pull-to-refresh. Pure CSS transform with a lightweight pointer
 * tracker — no animation library, no layout thrash. Triggers a medium haptic
 * when the threshold is crossed (matches Mail / Messages behavior).
 */
export function PullToRefresh({
  onRefresh,
  children,
  className,
  threshold = 72,
}: PullToRefreshProps) {
  // `dragging` is read during render to drive the snap-back transition, so it
  // has to live in state. Refs would be invisible to React's commit phase
  // and the lint plugin (rightly) flags accessing them mid-render.
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const startY = useRef<number | null>(null);
  const hapticFired = useRef(false);
  const haptics = useHaptics();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const onTouchStart = (event: React.TouchEvent) => {
    if (refreshing) return;
    const el = containerRef.current;
    if (!el) return;
    // Only arm when the scroll container is actually at the top — otherwise
    // we would steal vertical scroll from the inner list.
    if (el.scrollTop > 0) return;
    startY.current = event.touches[0].clientY;
    hapticFired.current = false;
    setDragging(true);
  };

  const onTouchMove = (event: React.TouchEvent) => {
    if (!dragging || startY.current === null) return;
    const dy = event.touches[0].clientY - startY.current;
    if (dy <= 0) {
      setPull(0);
      return;
    }
    // Rubber-band: dampen the further you pull, capped at 1.5× threshold.
    const damped = Math.min(dy * 0.55, threshold * 1.5);
    setPull(damped);
    if (!hapticFired.current && damped >= threshold) {
      hapticFired.current = true;
      void haptics.medium();
    } else if (hapticFired.current && damped < threshold) {
      hapticFired.current = false;
    }
  };

  const onTouchEnd = async () => {
    setDragging(false);
    if (refreshing) return;
    if (pull >= threshold) {
      setRefreshing(true);
      setPull(threshold);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPull(0);
        startY.current = null;
      }
    } else {
      setPull(0);
      startY.current = null;
    }
  };

  const ringProgress = Math.min(1, pull / threshold);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative h-full overflow-y-auto overscroll-y-contain",
        className,
      )}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 flex h-12 items-end justify-center"
        style={{
          transform: `translateY(${-48 + Math.min(pull, threshold)}px)`,
          opacity: ringProgress,
          transition: refreshing
            ? "transform 200ms ease, opacity 200ms ease"
            : dragging
              ? "none"
              : "transform 280ms cubic-bezier(0.2, 0.7, 0.2, 1), opacity 200ms ease",
        }}
      >
        <Loader2
          className={cn(
            "h-5 w-5 text-primary",
            refreshing ? "animate-spin" : "",
          )}
          style={{
            transform: refreshing
              ? undefined
              : `rotate(${ringProgress * 270}deg)`,
          }}
        />
      </div>
      <div
        style={{
          transform: `translateY(${refreshing ? threshold : pull}px)`,
          transition: dragging
            ? "none"
            : "transform 280ms cubic-bezier(0.2, 0.7, 0.2, 1)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
