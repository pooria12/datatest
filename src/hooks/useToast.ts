import type { Toast } from '../components/ui/Toast';
import { addToast, removeToast, useToasts } from '@/lib/toast-state';

/**
 * Thin wrapper over the single toast store in `lib/toast-state`, which is what <ToastProvider>
 * renders. (A second, separate store used to live here, so these toasts never appeared.)
 */
export function useToast() {
  useToasts();

  return {
    toast: (options: Omit<Toast, 'id'>) => addToast(options),
    dismiss: removeToast,
    success: (title: string, description?: string) => addToast({ title, description, variant: 'success' }),
    error: (title: string, description?: string) => addToast({ title, description, variant: 'destructive' }),
    warning: (title: string, description?: string) => addToast({ title, description, variant: 'warning' }),
    info: (title: string, description?: string) => addToast({ title, description, variant: 'info' }),
  };
}
