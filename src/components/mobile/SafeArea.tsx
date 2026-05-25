import { type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SafeAreaProps {
  children: ReactNode;
  className?: string;
  /** Apply safe-area padding on the named edges. Top + bottom are most common. */
  edges?: Array<"top" | "right" | "bottom" | "left">;
  style?: CSSProperties;
}

/**
 * Pads its children by the runtime safe-area insets reported by iOS.
 * Use this on any full-bleed container (header, tab bar, modal sheet) so
 * content stays clear of the notch / home indicator without the WebView
 * having to resize.
 */
export function SafeArea({
  children,
  className,
  edges = ["top", "bottom"],
  style,
}: SafeAreaProps) {
  const padding: CSSProperties = {};
  if (edges.includes("top")) padding.paddingTop = "env(safe-area-inset-top)";
  if (edges.includes("right")) padding.paddingRight = "env(safe-area-inset-right)";
  if (edges.includes("bottom")) padding.paddingBottom = "env(safe-area-inset-bottom)";
  if (edges.includes("left")) padding.paddingLeft = "env(safe-area-inset-left)";

  return (
    <div className={cn("min-h-0", className)} style={{ ...padding, ...style }}>
      {children}
    </div>
  );
}
