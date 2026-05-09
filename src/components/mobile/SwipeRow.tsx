import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useHaptics } from "@/hooks/useHaptics";

export interface SwipeAction {
  key: string;
  label: string;
  icon?: ReactNode;
  /** Tailwind classes applied to the action panel. */
  color: string;
  onAction: () => void;
}

interface SwipeRowProps {
  children: ReactNode;
  className?: string;
  /** Actions revealed by swiping the row to the left. */
  trailing?: SwipeAction[];
  /** Actions revealed by swiping the row to the right. */
  leading?: SwipeAction[];
}

const ACTION_WIDTH = 88;
const FULL_SWIPE_RATIO = 0.6;

/**
 * iOS-style swipeable row used in the work-queue list. Drag horizontally to
 * reveal Start / Pause / Issue actions; full-swipe past the threshold fires
 * the primary action immediately (matches the Mail "swipe to archive" feel).
 *
 * Vertical scroll is preserved by only locking the gesture once the swipe
 * exceeds 8px horizontally and is more horizontal than vertical.
 */
export function SwipeRow({
  children,
  className,
  trailing = [],
  leading = [],
}: SwipeRowProps) {
  const [offset, setOffset] = useState(0);
  const [animating, setAnimating] = useState(false);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const locked = useRef<"horizontal" | "vertical" | null>(null);
  const hapticFired = useRef(false);
  const haptics = useHaptics();

  const trailingWidth = trailing.length * ACTION_WIDTH;
  const leadingWidth = leading.length * ACTION_WIDTH;

  const onTouchStart = (event: React.TouchEvent) => {
    startX.current = event.touches[0].clientX;
    startY.current = event.touches[0].clientY;
    locked.current = null;
    hapticFired.current = false;
    setAnimating(false);
  };

  const onTouchMove = (event: React.TouchEvent) => {
    if (startX.current === null || startY.current === null) return;
    const dx = event.touches[0].clientX - startX.current;
    const dy = event.touches[0].clientY - startY.current;

    if (locked.current === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      // Pick an axis once and stick with it for the rest of the gesture.
      locked.current = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
    }
    if (locked.current === "vertical") return;

    let next = dx;
    if (next < 0 && trailingWidth === 0) next = 0;
    if (next > 0 && leadingWidth === 0) next = 0;
    // Rubber-band past the rest position so the gesture feels native.
    if (next < -trailingWidth) next = -trailingWidth + (next + trailingWidth) * 0.3;
    if (next > leadingWidth) next = leadingWidth + (next - leadingWidth) * 0.3;

    setOffset(next);

    const fullSwipeNeg = -trailingWidth - 60;
    const fullSwipePos = leadingWidth + 60;
    const inFullSwipe =
      (next < fullSwipeNeg && trailing.length > 0) ||
      (next > fullSwipePos && leading.length > 0);
    if (inFullSwipe && !hapticFired.current) {
      hapticFired.current = true;
      void haptics.medium();
    } else if (!inFullSwipe && hapticFired.current) {
      hapticFired.current = false;
    }
  };

  const onTouchEnd = () => {
    if (locked.current === "vertical") {
      reset();
      return;
    }

    const trailingFull = trailing.length > 0 && offset < -(trailingWidth * FULL_SWIPE_RATIO + 20);
    const leadingFull = leading.length > 0 && offset > leadingWidth * FULL_SWIPE_RATIO + 20;
    const trailingOpen = !trailingFull && offset < -trailingWidth / 2;
    const leadingOpen = !leadingFull && offset > leadingWidth / 2;

    setAnimating(true);
    if (trailingFull) {
      setOffset(0);
      trailing[0]?.onAction();
      void haptics.success();
    } else if (leadingFull) {
      setOffset(0);
      leading[0]?.onAction();
      void haptics.success();
    } else if (trailingOpen) {
      setOffset(-trailingWidth);
    } else if (leadingOpen) {
      setOffset(leadingWidth);
    } else {
      setOffset(0);
    }
    locked.current = null;
  };

  const reset = () => {
    setAnimating(true);
    setOffset(0);
    locked.current = null;
  };

  const triggerAction = (action: SwipeAction) => {
    setAnimating(true);
    setOffset(0);
    void haptics.light();
    action.onAction();
  };

  return (
    <div
      className={cn(
        "relative isolate select-none overflow-hidden rounded-xl",
        className,
      )}
    >
      {trailing.length > 0 ? (
        <div
          className="absolute inset-y-0 right-0 flex"
          aria-hidden={offset === 0}
        >
          {trailing.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={() => triggerAction(action)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-[11px] font-semibold text-white",
                action.color,
              )}
              style={{ width: ACTION_WIDTH }}
            >
              {action.icon ? (
                <span aria-hidden className="h-5 w-5">
                  {action.icon}
                </span>
              ) : null}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      ) : null}

      {leading.length > 0 ? (
        <div
          className="absolute inset-y-0 left-0 flex"
          aria-hidden={offset === 0}
        >
          {leading.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={() => triggerAction(action)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-[11px] font-semibold text-white",
                action.color,
              )}
              style={{ width: ACTION_WIDTH }}
            >
              {action.icon ? (
                <span aria-hidden className="h-5 w-5">
                  {action.icon}
                </span>
              ) : null}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div
        className="relative bg-card"
        style={{
          transform: `translateX(${offset}px)`,
          transition: animating
            ? "transform 240ms cubic-bezier(0.2, 0.7, 0.2, 1)"
            : "none",
          touchAction: "pan-y",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        onTransitionEnd={() => setAnimating(false)}
      >
        {children}
      </div>
    </div>
  );
}
