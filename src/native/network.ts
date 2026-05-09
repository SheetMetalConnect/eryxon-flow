/**
 * Network status hook + observer.
 *
 * Surfaces online/offline state from Capacitor's Network plugin on Android,
 * and from window.onLine + the standard 'online'/'offline' events on the web.
 * Operators on the shop floor can wander out of WiFi range; we want a
 * persistent banner and a way to stop write attempts that will fail.
 */

import { useEffect, useState } from "react";
import { isNativeApp } from "./platform";

export type ConnectionType =
  | "wifi"
  | "cellular"
  | "ethernet"
  | "none"
  | "unknown";

export interface NetworkStatus {
  online: boolean;
  connectionType: ConnectionType;
}

interface CapacitorNetworkModule {
  Network: {
    getStatus: () => Promise<{ connected: boolean; connectionType: string }>;
    addListener: (
      event: "networkStatusChange",
      cb: (status: { connected: boolean; connectionType: string }) => void
    ) => Promise<{ remove: () => Promise<void> }>;
  };
}

function normalizeType(t: string | undefined): ConnectionType {
  switch (t) {
    case "wifi":
    case "cellular":
    case "ethernet":
    case "none":
      return t;
    default:
      return "unknown";
  }
}

function defaultStatus(): NetworkStatus {
  return {
    online: typeof navigator !== "undefined" ? navigator.onLine : true,
    connectionType: "unknown",
  };
}

export async function getNetworkStatus(): Promise<NetworkStatus> {
  if (isNativeApp()) {
    try {
      const mod = (await import(
        "@capacitor/network"
      )) as unknown as CapacitorNetworkModule;
      const s = await mod.Network.getStatus();
      return {
        online: s.connected,
        connectionType: normalizeType(s.connectionType),
      };
    } catch {
      /* fall through to navigator.onLine */
    }
  }
  return defaultStatus();
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(defaultStatus);

  useEffect(() => {
    if (isNativeApp()) {
      let cancelled = false;
      let removeFn: (() => Promise<void>) | undefined;

      void (async () => {
        try {
          const mod = (await import(
            "@capacitor/network"
          )) as unknown as CapacitorNetworkModule;
          if (cancelled) return;
          const initial = await mod.Network.getStatus();
          if (cancelled) return;
          setStatus({
            online: initial.connected,
            connectionType: normalizeType(initial.connectionType),
          });
          const handle = await mod.Network.addListener(
            "networkStatusChange",
            (s) =>
              setStatus({
                online: s.connected,
                connectionType: normalizeType(s.connectionType),
              })
          );
          // If the component unmounted while we were awaiting, the listener is
          // already orphaned — release it now rather than leaking.
          if (cancelled) {
            void handle.remove();
            return;
          }
          removeFn = handle.remove;
        } catch {
          /* network plugin unavailable; keep defaultStatus */
        }
      })();

      return () => {
        cancelled = true;
        if (removeFn) void removeFn();
      };
    }

    const update = () =>
      setStatus({ online: navigator.onLine, connectionType: "unknown" });
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    update();
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return status;
}
