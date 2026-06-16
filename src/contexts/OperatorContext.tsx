import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useTenant } from "@/hooks/useTenant";
import { logger } from "@/lib/logger";
import {
  OPERATOR_IDLE_TIMEOUT_MS,
  OPERATOR_RESUME_STORAGE_KEY,
  OPERATOR_SESSION_CHECK_INTERVAL_MS,
  OPERATOR_SESSION_TTL_MS,
  type OperatorSessionLockReason,
} from "./operatorSession";

/**
 * Active Operator - the employee currently working at the terminal
 * This is separate from the authenticated user (which could be a shared "Shopfloor" account)
 */
export interface ActiveOperator {
  id: string;
  employee_id: string;
  full_name: string;
  tenant_id: string;
}

interface VerifyPinResult {
  success: boolean;
  operator?: ActiveOperator;
  error_code?: string;
  error_message?: string;
  attempts_remaining?: number;
  locked_until?: Date | null;
}

interface OperatorContextType {
  activeOperator: ActiveOperator | null;
  resumeOperator: ActiveOperator | null;
  isLoading: boolean;
  lockReason: OperatorSessionLockReason;
  verifyAndSwitchOperator: (employeeId: string, pin: string) => Promise<VerifyPinResult>;
  clearActiveOperator: () => void;
}

const OperatorContext = createContext<OperatorContextType | undefined>(undefined);

export function OperatorProvider({ children }: { children: React.ReactNode }) {
  const profile = useProfile();
  const { tenant } = useTenant();
  const [activeOperator, setActiveOperator] = useState<ActiveOperator | null>(null);
  const [resumeOperator, setResumeOperator] = useState<ActiveOperator | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lockReason, setLockReason] = useState<OperatorSessionLockReason>(null);
  const verifiedAtRef = useRef<number | null>(null);
  const lastInteractionAtRef = useRef<number | null>(null);

  const clearResumeOperator = useCallback(() => {
    setResumeOperator(null);
    sessionStorage.removeItem(OPERATOR_RESUME_STORAGE_KEY);
  }, []);

  const lockOperatorSession = useCallback((
    reason: Exclude<OperatorSessionLockReason, null>,
  ) => {
    setActiveOperator(null);
    verifiedAtRef.current = null;
    lastInteractionAtRef.current = null;
    setLockReason(reason);
  }, []);

  // Restore only non-authorizing operator metadata after reload.
  useEffect(() => {
    if (tenant?.id === undefined) {
      const resetTimeout = window.setTimeout(() => {
        setActiveOperator(null);
        setResumeOperator(null);
        setLockReason(null);
        setIsLoading(false);
      }, 0);
      return () => clearTimeout(resetTimeout);
    }

    const stored = sessionStorage.getItem(OPERATOR_RESUME_STORAGE_KEY);
    let nextResumeOperator: ActiveOperator | null = null;
    if (stored) {
      try {
        const parsed: unknown = JSON.parse(stored);
        if (
          typeof parsed === "object" &&
          parsed !== null &&
          "id" in parsed &&
          typeof (parsed as Record<string, unknown>).id === "string" &&
          "employee_id" in parsed &&
          typeof (parsed as Record<string, unknown>).employee_id === "string" &&
          "full_name" in parsed &&
          typeof (parsed as Record<string, unknown>).full_name === "string" &&
          "tenant_id" in parsed &&
          (parsed as Record<string, unknown>).tenant_id === tenant.id
        ) {
          nextResumeOperator = parsed as ActiveOperator;
        } else {
          sessionStorage.removeItem(OPERATOR_RESUME_STORAGE_KEY);
        }
      } catch {
        sessionStorage.removeItem(OPERATOR_RESUME_STORAGE_KEY);
      }
    }

    const loadTimeout = window.setTimeout(() => {
      setActiveOperator(null);
      setResumeOperator(nextResumeOperator);
      verifiedAtRef.current = null;
      lastInteractionAtRef.current = null;
      setLockReason(null);
      setIsLoading(false);
    }, 0);

    return () => clearTimeout(loadTimeout);
  }, [tenant?.id]);

  useEffect(() => {
    if (!profile) {
      const clearTimeoutId = window.setTimeout(() => {
        setActiveOperator(null);
        setResumeOperator(null);
        setLockReason(null);
        verifiedAtRef.current = null;
        lastInteractionAtRef.current = null;
        sessionStorage.removeItem(OPERATOR_RESUME_STORAGE_KEY);
        setIsLoading(false);
      }, 0);

      return () => clearTimeout(clearTimeoutId);
    }
    return;
  }, [profile]);

  useEffect(() => {
    if (!activeOperator) return;

    const recordActivity = () => {
      lastInteractionAtRef.current = Date.now();
    };

    const sessionCheck = window.setInterval(() => {
      const now = Date.now();
      const verifiedAt = verifiedAtRef.current;
      const lastInteractionAt = lastInteractionAtRef.current;

      if (verifiedAt !== null && now - verifiedAt >= OPERATOR_SESSION_TTL_MS) {
        lockOperatorSession("session_expired");
        return;
      }

      if (
        lastInteractionAt !== null &&
        now - lastInteractionAt >= OPERATOR_IDLE_TIMEOUT_MS
      ) {
        lockOperatorSession("idle_timeout");
      }
    }, OPERATOR_SESSION_CHECK_INTERVAL_MS);

    const events: Array<keyof WindowEventMap> = [
      "pointerdown",
      "pointermove",
      "keydown",
      "scroll",
      "touchstart",
    ];

    events.forEach((eventName) => {
      window.addEventListener(eventName, recordActivity, { passive: true });
    });

    return () => {
      window.clearInterval(sessionCheck);
      events.forEach((eventName) => {
        window.removeEventListener(eventName, recordActivity);
      });
    };
  }, [activeOperator, lockOperatorSession]);

  const verifyAndSwitchOperator = useCallback(async (
    employeeId: string,
    pin: string
  ): Promise<VerifyPinResult> => {
    try {
      const { data, error } = await supabase.rpc("verify_operator_pin", {
        p_employee_id: employeeId,
        p_pin: pin,
      });

      if (error) {
        logger.error('OperatorContext', 'PIN verification error', error);
        return {
          success: false,
          error_code: "RPC_ERROR",
          error_message: error.message,
        };
      }

      const result = Array.isArray(data) ? data[0] : data;

      if (!result) {
        return {
          success: false,
          error_code: "NO_RESULT",
          error_message: "Verification failed",
        };
      }

      if (result.success) {
        const operator: ActiveOperator = {
          id: result.operator_id,
          employee_id: result.employee_id,
          full_name: result.full_name,
          tenant_id: result.tenant_id,
        };

        const now = Date.now();
        setActiveOperator(operator);
        setResumeOperator(operator);
        setLockReason(null);
        verifiedAtRef.current = now;
        lastInteractionAtRef.current = now;
        sessionStorage.setItem(OPERATOR_RESUME_STORAGE_KEY, JSON.stringify(operator));

        return { success: true, operator };
      } else {
        return {
          success: false,
          error_code: result.error_code,
          error_message: result.error_message,
          attempts_remaining: result.attempts_remaining,
          locked_until: result.locked_until_ts ? new Date(result.locked_until_ts) : null,
        };
      }
    } catch (err: unknown) {
      logger.error('OperatorContext', 'Operator verification error', err);
      return {
        success: false,
        error_code: "EXCEPTION",
        error_message: err instanceof Error ? err.message : "An unexpected error occurred",
      };
    }
  }, []);

  const clearActiveOperator = useCallback(() => {
    setActiveOperator(null);
    setLockReason(null);
    verifiedAtRef.current = null;
    lastInteractionAtRef.current = null;
    clearResumeOperator();
  }, [clearResumeOperator]);

  return (
    <OperatorContext.Provider
      value={{
        activeOperator,
        resumeOperator,
        isLoading,
        lockReason,
        verifyAndSwitchOperator,
        clearActiveOperator,
      }}
    >
      {children}
    </OperatorContext.Provider>
  );
}

export function useOperator() {
  const context = useContext(OperatorContext);
  if (context === undefined) {
    throw new Error("useOperator must be used within an OperatorProvider");
  }
  return context;
}
