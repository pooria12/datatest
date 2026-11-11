import { useState, ReactNode } from 'react';
import { cn } from '@lib/utils';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { removeToast, useToasts } from '@lib/toast-state';

export type ToastVariant = 'default' | 'success' | 'warning' | 'destructive' | 'info';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastProviderProps {
  children: ReactNode;
}

const toastIcons: Record<ToastVariant, ReactNode> = {
  default: <CheckCircle className="h-5 w-5 text-primary" />,
  success: <CheckCircle className="h-5 w-5 text-success" />,
  warning: <AlertTriangle className="h-5 w-5 text-warning" />,
  destructive: <AlertCircle className="h-5 w-5 text-destructive" />,
  info: <Info className="h-5 w-5 text-info" />,
};

const toastBg: Record<ToastVariant, string> = {
  default: 'bg-primary text-primary-foreground',
  success: 'bg-success text-success-foreground',
  warning: 'bg-warning text-warning-foreground',
  destructive: 'bg-destructive text-destructive-foreground',
  info: 'bg-info text-info-foreground',
};

export function ToastProvider({ children }: ToastProviderProps) {
  const currentToasts = useToasts();
  
  return (
    <>
      {children}
      <div
        className="fixed bottom-4 right-4 z-[var(--z-toast)] flex flex-col gap-2 pointer-events-none"
        aria-live="polite"
        aria-label="Notifications"
      >
        {currentToasts.map((toast) => (
          <ToastComponent key={toast.id} toast={toast} onClose={removeToast} />
        ))}
      </div>
    </>
  );
}

interface ToastComponentProps {
  toast: Toast;
  onClose: (id: string) => void;
}

function ToastComponent({ toast, onClose }: ToastComponentProps) {
  const [visible, setVisible] = useState(true);
  
  // Auto-dismiss timers are owned by the toast store (lib/toast-state); a duration of 0 stays open.
  if (!visible) return null;
  
  return (
    <div
      className={cn(
        'pointer-events-auto flex items-start gap-3 w-[min(360px,calc(100vw-2rem))] rounded-lg border p-4 shadow-lg',
        'animate-in slide-in-from-right-full duration-300 ease-out',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full',
        toastBg[toast.variant]
      )}
      role="alert"
    >
      <div className="flex-shrink-0 mt-0.5">{toastIcons[toast.variant]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{toast.title}</p>
        {toast.description && (
          <p className="mt-1 text-sm opacity-90">{toast.description}</p>
        )}
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="mt-2 text-sm font-medium underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-current"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        onClick={() => {
          setVisible(false);
          setTimeout(() => onClose(toast.id), 200);
        }}
        className="flex-shrink-0 text-current opacity-50 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// useToast hook is exported from @hooks/useToast to avoid React Fast Refresh warnings