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
      /* fall through */
    }
  }
  return {
    online: typeof navigator !== "undefined" ? navigator.onLine : true,
    connectionType: "unknown",
  };
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(() => ({
    online: typeof navigator !== "undefined" ? navigator.onLine : true,
    connectionType: "unknown",
  }));

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    if (isNativeApp()) {
      let removeFn: (() => Promise<void>) | undefined;
      (async () => {
        try {
          const mod = (await import(
            "@capacitor/network"
          )) as unknown as CapacitorNetworkModule;
          const initial = await mod.Network.getStatus();
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
          removeFn = handle.remove;
        } catch {
          /* ignore */
        }
      })();
      cleanup = () => {
        if (removeFn) void removeFn();
      };
    } else {
      const update = () =>
        setStatus({
          online: navigator.onLine,
          connectionType: "unknown",
        });
      window.addEventListener("online", update);
      window.addEventListener("offline", update);
      update();
      cleanup = () => {
        window.removeEventListener("online", update);
        window.removeEventListener("offline", update);
      };
    }

    return () => cleanup?.();
  }, []);

  return status;
}
