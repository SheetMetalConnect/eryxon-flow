import React, { createContext, useContext, useState, useCallback } from 'react';
import { Snackbar, Alert, AlertColor, Slide, SlideProps, Button, IconButton, Stack } from '@mui/material';
import { PushPin as PushPinIcon, Undo as UndoIcon } from '@mui/icons-material';

export interface ToastAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
}

interface Toast {
  id: string;
  message: string;
  severity: AlertColor;
  duration?: number;
  actions?: ToastAction[];
  showPinAction?: boolean;
  onPin?: () => void;
}

interface ToastContextType {
  showToast: (
    message: string,
    severity?: AlertColor,
    duration?: number,
    options?: {
      actions?: ToastAction[];
      showPinAction?: boolean;
      onPin?: () => void;
    }
  ) => void;
  showSuccess: (message: string, duration?: number, actions?: ToastAction[]) => void;
  showError: (message: string, duration?: number, actions?: ToastAction[]) => void;
  showWarning: (message: string, duration?: number, actions?: ToastAction[]) => void;
  showInfo: (message: string, duration?: number, actions?: ToastAction[]) => void;
  showNotificationToast: (
    message: string,
    severity?: AlertColor,
    onPin?: () => void,
    actions?: ToastAction[]
  ) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="up" />;
}

interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (
      message: string,
      severity: AlertColor = 'info',
      duration: number = 4000,
      options?: {
        actions?: ToastAction[];
        showPinAction?: boolean;
        onPin?: () => void;
      }
    ) => {
      const id = Math.random().toString(36).substr(2, 9);
      const newToast: Toast = {
        id,
        message,
        severity,
        duration,
        actions: options?.actions,
        showPinAction: options?.showPinAction,
        onPin: options?.onPin,
      };
      setToasts((prev) => [...prev, newToast]);
    },
    []
  );

  const showSuccess = useCallback(
    (message: string, duration?: number, actions?: ToastAction[]) => {
      showToast(message, 'success', duration, { actions });
    },
    [showToast]
  );

  const showError = useCallback(
    (message: string, duration?: number, actions?: ToastAction[]) => {
      showToast(message, 'error', duration, { actions });
    },
    [showToast]
  );

  const showWarning = useCallback(
    (message: string, duration?: number, actions?: ToastAction[]) => {
      showToast(message, 'warning', duration, { actions });
    },
    [showToast]
  );

  const showInfo = useCallback(
    (message: string, duration?: number, actions?: ToastAction[]) => {
      showToast(message, 'info', duration, { actions });
    },
    [showToast]
  );

  const showNotificationToast = useCallback(
    (message: string, severity: AlertColor = 'info', onPin?: () => void, actions?: ToastAction[]) => {
      showToast(message, severity, 6000, {
        showPinAction: true,
        onPin,
        actions,
      });
    },
    [showToast]
  );

  const handleClose = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

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
      {toasts.map((toast, index) => (
        <Snackbar
          key={toast.id}
          open={true}
          autoHideDuration={toast.duration}
          onClose={() => handleClose(toast.id)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          TransitionComponent={SlideTransition}
          sx={{
            bottom: { xs: 16, sm: 24 + index * 70 },
          }}
        >
          <Alert
            onClose={() => handleClose(toast.id)}
            severity={toast.severity}
            variant="filled"
            sx={{
              width: '100%',
              minWidth: 300,
              maxWidth: 500,
              boxShadow: 3,
              '& .MuiAlert-message': {
                flexGrow: 1,
              },
            }}
            action={
              (toast.actions || toast.showPinAction) && (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  {/* Custom actions */}
                  {toast.actions?.map((action, idx) => (
                    <Button
                      key={idx}
                      color="inherit"
                      size="small"
                      onClick={() => {
                        action.onClick();
                        handleClose(toast.id);
                      }}
                      startIcon={action.icon}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 600,
                      }}
                    >
                      {action.label}
                    </Button>
                  ))}

                  {/* Pin action for notifications */}
                  {toast.showPinAction && toast.onPin && (
                    <IconButton
                      color="inherit"
                      size="small"
                      onClick={() => {
                        toast.onPin?.();
                        handleClose(toast.id);
                      }}
                      sx={{
                        ml: 0.5,
                      }}
                    >
                      <PushPinIcon fontSize="small" />
                    </IconButton>
                  )}
                </Stack>
              )
            }
          >
            {toast.message}
          </Alert>
        </Snackbar>
      ))}
    </ToastContext.Provider>
  );
};
