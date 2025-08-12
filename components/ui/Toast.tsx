'use client';

import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { Toast as ToastType } from '@/types';
import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/lib/utils';

interface ToastProps {
  toast: ToastType;
}

export function Toast({ toast }: ToastProps) {
  const { removeToast } = useUIStore();

  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        removeToast(toast.id);
      }, toast.duration);

      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.duration, removeToast]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getStyles = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  return (
    <div
      className={cn(
        "flex items-center p-4 border rounded-lg shadow-lg max-w-sm w-full",
        "transform transition-all duration-300 ease-in-out",
        "animate-in slide-in-from-right-full",
        getStyles()
      )}
    >
      <div className="flex-shrink-0">
        {getIcon()}
      </div>
      
      <div className="ml-3 flex-1">
        <p className="text-sm font-medium">
          {toast.message}
        </p>
      </div>
      
      <button
        onClick={() => removeToast(toast.id)}
        className="ml-4 flex-shrink-0 p-1 rounded-md hover:bg-black hover:bg-opacity-10 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts } = useUIStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
