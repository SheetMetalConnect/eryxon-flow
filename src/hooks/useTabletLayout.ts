/**
 * Tablet-aware layout hook.
 *
 * Returns whether the current viewport is tablet-class (Android sw600dp) or
 * larger. Updates on resize/rotation so split-pane views can adapt without
 * a full re-mount. We listen to matchMedia rather than 'resize' for cheap
 * notifications on Pixel/Samsung tablets.
 */

import { useEffect, useState } from "react";

const TABLET_QUERY = "(min-width: 768px)";
const LARGE_TABLET_QUERY = "(min-width: 1024px)";

export interface TabletLayout {
  isTablet: boolean;
  isLargeTablet: boolean;
  isLandscape: boolean;
}

function getInitial(): TabletLayout {
  if (typeof window === "undefined") {
    return { isTablet: false, isLargeTablet: false, isLandscape: false };
  }
  return {
    isTablet: window.matchMedia(TABLET_QUERY).matches,
    isLargeTablet: window.matchMedia(LARGE_TABLET_QUERY).matches,
    isLandscape: window.innerWidth >= window.innerHeight,
  };
}

export function useTabletLayout(): TabletLayout {
  const [state, setState] = useState<TabletLayout>(getInitial);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mqTablet = window.matchMedia(TABLET_QUERY);
    const mqLarge = window.matchMedia(LARGE_TABLET_QUERY);
    const mqOrient = window.matchMedia("(orientation: landscape)");

    const update = () =>
      setState({
        isTablet: mqTablet.matches,
        isLargeTablet: mqLarge.matches,
        isLandscape: mqOrient.matches,
      });

    mqTablet.addEventListener("change", update);
    mqLarge.addEventListener("change", update);
    mqOrient.addEventListener("change", update);
    return () => {
      mqTablet.removeEventListener("change", update);
      mqLarge.removeEventListener("change", update);
      mqOrient.removeEventListener("change", update);
    };
  }, []);

  return state;
}
