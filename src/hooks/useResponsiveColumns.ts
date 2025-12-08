import { useState, useEffect, useMemo } from "react";
import { VisibilityState } from "@tanstack/react-table";

type Breakpoint = "sm" | "md" | "lg" | "xl";

interface ResponsiveColumnConfig {
  /** Column ID */
  id: string;
  /** Hide below this breakpoint (e.g., 'md' means hidden on sm screens) */
  hideBelow?: Breakpoint;
  /** Always visible */
  alwaysVisible?: boolean;
}

const breakpointValues: Record<Breakpoint, number> = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
};

/**
 * Hook to manage responsive column visibility in DataTable
 *
 * Usage:
 * ```tsx
 * const { columnVisibility, isMobile } = useResponsiveColumns([
 *   { id: "job_number", alwaysVisible: true },
 *   { id: "flow", hideBelow: "md" },
 *   { id: "details", hideBelow: "sm" },
 * ]);
 * ```
 */
export function useResponsiveColumns(
  config: ResponsiveColumnConfig[],
  defaultVisibility: VisibilityState = {}
) {
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1024
  );

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    // Set initial width
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const columnVisibility = useMemo(() => {
    const visibility: VisibilityState = { ...defaultVisibility };

    config.forEach((col) => {
      if (col.alwaysVisible) {
        visibility[col.id] = true;
        return;
      }

      if (col.hideBelow) {
        const breakpointWidth = breakpointValues[col.hideBelow];
        visibility[col.id] = windowWidth >= breakpointWidth;
      }
    });

    return visibility;
  }, [config, defaultVisibility, windowWidth]);

  const isMobile = windowWidth < breakpointValues.sm;
  const isTablet = windowWidth >= breakpointValues.sm && windowWidth < breakpointValues.lg;
  const isDesktop = windowWidth >= breakpointValues.lg;

  return {
    columnVisibility,
    windowWidth,
    isMobile,
    isTablet,
    isDesktop,
  };
}

/**
 * Simple hook to get current breakpoint
 */
export function useBreakpoint() {
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1024
  );

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return {
    isMobile: windowWidth < breakpointValues.sm,
    isTablet: windowWidth >= breakpointValues.sm && windowWidth < breakpointValues.lg,
    isDesktop: windowWidth >= breakpointValues.lg,
    width: windowWidth,
  };
}
