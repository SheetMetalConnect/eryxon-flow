/**
 * Hook for the hardware back button. No-op on the web build (there is no
 * hardware back button); kept so mobile shells can call it unconditionally.
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
