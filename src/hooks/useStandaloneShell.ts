import { useEffect, useState } from "react";
import { isStandalone } from "@/native";

export interface StandaloneShellContext {
  isStandalone: boolean;
}

export function useStandaloneShell(): StandaloneShellContext {
  const [snapshot, setSnapshot] = useState<StandaloneShellContext>(() => ({
    isStandalone: isStandalone(),
  }));

  useEffect(() => {
    const mqlStandalone = window.matchMedia("(display-mode: standalone)");
    const mqlFullscreen = window.matchMedia("(display-mode: fullscreen)");

    const update = () => setSnapshot({ isStandalone: isStandalone() });

    mqlStandalone.addEventListener("change", update);
    mqlFullscreen.addEventListener("change", update);
    return () => {
      mqlStandalone.removeEventListener("change", update);
      mqlFullscreen.removeEventListener("change", update);
    };
  }, []);

  return snapshot;
}
