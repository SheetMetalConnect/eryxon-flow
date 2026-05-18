/**
 * Wires the Android hardware back button to React Router via Capacitor's App
 * plugin. No-op on the web. Pops history when there's somewhere to go,
 * otherwise minimises the app instead of exiting (Android convention).
 */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { wireHardwareBack } from "@/native";

export function useHardwareBack(): void {
  const navigate = useNavigate();
  useEffect(() => {
    void wireHardwareBack(navigate);
  }, [navigate]);
}
