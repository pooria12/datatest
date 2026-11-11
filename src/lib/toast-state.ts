import { useState, useEffect } from 'react';
import type { Toast } from '../components/ui/Toast';

let toastId = 0;
const generateId = () => `toast-${++toastId}-${Date.now()}`;

const listeners = new Set<() => void>();
export let toasts: Toast[] = [];

export function notify() {
  listeners.forEach((listener) => listener());
}

export function addToast(toast: Omit<Toast, 'id'> & { id?: string }) {
  const newToast: Toast = { ...toast, id: toast.id || generateId() };
  toasts = [...toasts, newToast];
  notify();
  
  if (toast.duration !== 0) {
    setTimeout(() => {
      removeToast(newToast.id);
    }, toast.duration ?? 5000);
  }
  
  return newToast.id;
}

export function removeToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  notify();
}

export function useToasts() {
  const [, setTick] = useState(0);
  
  useEffect(() => {
    const listener = (): void => { setTick((t) => t + 1); };
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);
  
  return toasts;
}