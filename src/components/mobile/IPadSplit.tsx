import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface IPadSplitProps {
  /** Master pane (always rendered). */
  master: ReactNode;
  /** Detail pane — when null on iPhone we render a placeholder. */
  detail?: ReactNode;
  /** Empty-state shown in the detail column when nothing is selected. */
  emptyState?: ReactNode;
  /** Force the master width (default 380px) for compact lists. */
  masterWidth?: number;
  className?: string;
  /**
   * When true, the master collapses on small iPad sizes (Slide Over) and the
   * detail goes full-bleed. Mirrors UISplitViewController auto-collapsing.
   */
  collapseUnder?: number;
}

/**
 * iPad-class split view. Two columns side-by-side with a pinned divider, and
 * a graceful collapse to single-column on smaller widths. Designed to host a
 * persistent list (work queue, parts, jobs) on the left and the
 * currently-selected detail on the right.
 */
export function IPadSplit({
  master,
  detail,
  emptyState,
  masterWidth = 380,
  className,
  collapseUnder = 768,
}: IPadSplitProps) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full overflow-hidden",
        className,
      )}
      style={
        {
          "--ipad-master-width": `${masterWidth}px`,
          "--ipad-collapse": `${collapseUnder}px`,
        } as React.CSSProperties
      }
    >
      <aside
        className={cn(
          "flex h-full min-h-0 shrink-0 flex-col border-r border-border/60",
          "bg-card/40 backdrop-blur-sm",
        )}
        style={{ width: "var(--ipad-master-width)" }}
      >
        {master}
      </aside>
      <section className="flex h-full min-h-0 flex-1 flex-col bg-background">
        {detail ?? (
          <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">
            {emptyState ?? "Select an item from the list."}
          </div>
        )}
      </section>
    </div>
  );
}
