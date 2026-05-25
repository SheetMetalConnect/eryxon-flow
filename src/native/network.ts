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
      // The Capacitor handshake is async (dynamic import + getStatus +
      // addListener). If the component unmounts *during* that handshake the
      // synchronous cleanup runs first and the listener would register
      // afterwards, leaking past the component lifetime. We guard with an
      // `unmounted` flag at every await boundary AND tear down a listener
      // that resolves after we've already unmounted.
      let unmounted = false;
      let removeFn: (() => Promise<void>) | undefined;
      void (async () => {
        try {
          const mod = (await import(
            "@capacitor/network"
          )) as unknown as CapacitorNetworkModule;
          if (unmounted) return;
          const initial = await mod.Network.getStatus();
          if (unmounted) return;
          setStatus({
            online: initial.connected,
            connectionType: normalizeType(initial.connectionType),
          });
          const handle = await mod.Network.addListener(
            "networkStatusChange",
            (s) => {
              if (unmounted) return;
              setStatus({
                online: s.connected,
                connectionType: normalizeType(s.connectionType),
              });
            }
          );
          if (unmounted) {
            void handle.remove();
            return;
          }
          removeFn = handle.remove;
        } catch {
          /* ignore */
        }
      })();
      cleanup = () => {
        unmounted = true;
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
