"use client";

import * as React from 'react';
import { toast } from 'sonner';
import { Pin, Undo2 } from 'lucide-react';

// Re-export toast functions with our custom styling
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
}

interface ToastOptions {
  duration?: number;
  actions?: ToastAction[];
  showPinAction?: boolean;
  onPin?: () => void;
}

// Toast context for backward compatibility with existing MUI ToastProvider usage
interface ToastContextType {
  showToast: (
    message: string,
    severity?: ToastType,
    duration?: number,
    options?: ToastOptions
  ) => void;
  showSuccess: (message: string, duration?: number, actions?: ToastAction[]) => void;
  showError: (message: string, duration?: number, actions?: ToastAction[]) => void;
  showWarning: (message: string, duration?: number, actions?: ToastAction[]) => void;
  showInfo: (message: string, duration?: number, actions?: ToastAction[]) => void;
  showNotificationToast: (
    message: string,
    severity?: ToastType,
    onPin?: () => void,
    actions?: ToastAction[]
  ) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

// Helper to create action buttons for toasts
const createActionButton = (action: ToastAction, toastId: string | number) => (
  <button
    onClick={() => {
      action.onClick();
      toast.dismiss(toastId);
    }}
    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded hover:bg-white/10 transition-colors"
  >
    {action.icon}
    {action.label}
  </button>
);

const createPinButton = (onPin: () => void, toastId: string | number) => (
  <button
    onClick={() => {
      onPin();
      toast.dismiss(toastId);
    }}
    className="p-1 rounded hover:bg-white/10 transition-colors"
    aria-label="Pin notification"
  >
    <Pin className="h-4 w-4" />
  </button>
);

interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const showToast = React.useCallback(
    (
      message: string,
      severity: ToastType = 'info',
      duration: number = 4000,
      options?: ToastOptions
    ) => {
      const toastFn = {
        success: toast.success,
        error: toast.error,
        warning: toast.warning,
        info: toast.info,
      }[severity];

      const toastId = toastFn(message, {
        duration,
        action: options?.actions?.length || options?.showPinAction ? (
          <div className="flex items-center gap-1">
            {options?.actions?.map((action, idx) => (
              <React.Fragment key={idx}>
                {createActionButton(action, toastId)}
              </React.Fragment>
            ))}
            {options?.showPinAction && options?.onPin && createPinButton(options.onPin, toastId)}
          </div>
        ) : undefined,
      });

      return toastId;
    },
    []
  );

  const showSuccess = React.useCallback(
    (message: string, duration?: number, actions?: ToastAction[]) => {
      showToast(message, 'success', duration, { actions });
    },
    [showToast]
  );

  const showError = React.useCallback(
    (message: string, duration?: number, actions?: ToastAction[]) => {
      showToast(message, 'error', duration, { actions });
    },
    [showToast]
  );

  const showWarning = React.useCallback(
    (message: string, duration?: number, actions?: ToastAction[]) => {
      showToast(message, 'warning', duration, { actions });
    },
    [showToast]
  );

  const showInfo = React.useCallback(
    (message: string, duration?: number, actions?: ToastAction[]) => {
      showToast(message, 'info', duration, { actions });
    },
    [showToast]
  );

  const showNotificationToast = React.useCallback(
    (
      message: string,
      severity: ToastType = 'info',
      onPin?: () => void,
      actions?: ToastAction[]
    ) => {
      showToast(message, severity, 6000, {
        showPinAction: true,
        onPin,
        actions,
      });
    },
    [showToast]
  );

  const contextValue: ToastContextType = {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showNotificationToast,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
    </ToastContext.Provider>
  );
}

// Direct toast functions for simple usage without context
export const showToast = {
  success: (message: string, options?: { duration?: number }) =>
    toast.success(message, options),
  error: (message: string, options?: { duration?: number }) =>
    toast.error(message, options),
  warning: (message: string, options?: { duration?: number }) =>
    toast.warning(message, options),
  info: (message: string, options?: { duration?: number }) =>
    toast.info(message, options),
  promise: toast.promise,
  dismiss: toast.dismiss,
  custom: toast.custom,
};
