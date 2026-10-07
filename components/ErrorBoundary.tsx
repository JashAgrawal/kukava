'use client';

import { Component, useEffect, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { captureException } from '@/lib/errorTracking';
import { logger } from '@/lib/logger';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Custom fallback; receives the error and a reset callback. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
  /** Changing this value clears a previous error, e.g. on navigation. */
  resetKeys?: unknown[];
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    captureException(error, 'React render error', {
      componentStack: errorInfo.componentStack ?? undefined,
    });
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    const { resetKeys } = this.props;
    if (!this.state.error || !resetKeys) return;

    const changed =
      prevProps.resetKeys?.length !== resetKeys.length ||
      resetKeys.some((key, index) => !Object.is(key, prevProps.resetKeys?.[index]));

    if (changed) {
      this.reset();
    }
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    const { children, fallback } = this.props;

    if (!error) return children;
    if (fallback) return fallback(error, this.reset);

    return (
      <div
        role="alert"
        className="flex flex-col items-center justify-center text-center p-8 gap-4"
      >
        <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-destructive" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-1">
            Something went wrong
          </h2>
          <p className="text-sm text-muted-foreground">
            The error has been reported. You can try again.
          </p>
        </div>
        <button
          onClick={this.reset}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try again
        </button>
      </div>
    );
  }
}

export function AppErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary resetKeys={[children]}>
      <GlobalErrorListeners />
      {children}
    </ErrorBoundary>
  );
}

/**
 * Routes window-level failures into the same reporting seam as render errors,
 * so an unhandled rejection is not invisible just because nothing rendered.
 */
function GlobalErrorListeners() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      captureException(event.error ?? event.message, 'Unhandled window error');
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      captureException(event.reason, 'Unhandled promise rejection');
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    logger.debug('Global error listeners attached');

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}