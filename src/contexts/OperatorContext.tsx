import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

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
  isLoading: boolean;
  verifyAndSwitchOperator: (employeeId: string, pin: string) => Promise<VerifyPinResult>;
  clearActiveOperator: () => void;
}

const STORAGE_KEY = "active_operator";

const OperatorContext = createContext<OperatorContextType | undefined>(undefined);

export function OperatorProvider({ children }: { children: React.ReactNode }) {
  const { profile, tenant } = useAuth();
  const [activeOperator, setActiveOperator] = useState<ActiveOperator | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load active operator from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Validate that the stored operator belongs to current tenant
        if (parsed.tenant_id === tenant?.id) {
          setActiveOperator(parsed);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, [tenant?.id]);

  // Clear active operator when user logs out or changes tenant
  useEffect(() => {
    if (!profile) {
      setActiveOperator(null);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [profile]);

  const verifyAndSwitchOperator = useCallback(async (
    employeeId: string,
    pin: string
  ): Promise<VerifyPinResult> => {
    try {
      const { data, error } = await supabase.rpc("verify_operator_pin" as any, {
        p_employee_id: employeeId,
        p_pin: pin,
      });

      if (error) {
        console.error("PIN verification error:", error);
        return {
          success: false,
          error_code: "RPC_ERROR",
          error_message: error.message,
        };
      }

      // The RPC returns an array with one row
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

        setActiveOperator(operator);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(operator));

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
    } catch (err: any) {
      console.error("Operator verification error:", err);
      return {
        success: false,
        error_code: "EXCEPTION",
        error_message: err.message || "An unexpected error occurred",
      };
    }
  }, []);

  const clearActiveOperator = useCallback(() => {
    setActiveOperator(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <OperatorContext.Provider
      value={{
        activeOperator,
        isLoading,
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
