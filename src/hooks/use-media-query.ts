import { useState, useEffect } from "react";

export function useMediaQuery(query: string): boolean {
  const getMatches = () => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  };
  const [matches, setMatches] = useState<boolean>(getMatches);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia(query);
    const initTimeout = window.setTimeout(() => {
      setMatches(mediaQuery.matches);
    }, 0);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener("change", handler);
    return () => {
      clearTimeout(initTimeout);
      mediaQuery.removeEventListener("change", handler);
    };
  }, [query]);

  return matches;
}
