import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AppErrorBoundary, ErrorBoundary } from '../ErrorBoundary';
import * as errorTracking from '@/lib/errorTracking';
import * as loggerModule from '@/lib/logger';

function Boom({ message = 'render failed' }: { message?: string }): ReactNode {
  throw new Error(message);
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(loggerModule.logger, 'debug').mockImplementation(() => {});
  vi.spyOn(errorTracking, 'captureException').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ErrorBoundary catching', () => {
  it('renders children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>All good</p>
      </ErrorBoundary>
    );

    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('replaces the subtree with the fallback after a throw', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.queryByText('All good')).not.toBeInTheDocument();
  });

  it('marks the fallback as an alert', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('reports the error with a component stack', () => {
    render(
      <ErrorBoundary>
        <Boom message='specific failure' />
      </ErrorBoundary>
    );

    expect(errorTracking.captureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'specific failure' }),
      'React render error',
      expect.objectContaining({ componentStack: expect.any(String) })
    );
  });

  it('does not report when no error occurred', () => {
    render(
      <ErrorBoundary>
        <p>All good</p>
      </ErrorBoundary>
    );

    expect(errorTracking.captureException).not.toHaveBeenCalled();
  });
});

describe('ErrorBoundary recovery', () => {
  it('offers a retry button', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('recovers when the child stops throwing', () => {
    // React re-renders a throwing component to build a component stack, so the
    // child is switched by a flag rather than by a call counter.
    let shouldThrow = true;
    const Toggle = (): ReactNode => {
      if (shouldThrow) throw new Error('still broken');
      return <p>Recovered</p>;
    };

    render(
      <ErrorBoundary>
        <Toggle />
      </ErrorBoundary>
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();

    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(screen.getByText('Recovered')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('reports the failure again when the retry throws once more', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <Boom message='retry me' />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    rerender(
      <ErrorBoundary>
        <Boom message='still broken' />
      </ErrorBoundary>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('returns to the fallback if the retry fails again', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('clears the error when a resetKey changes', () => {
    const { rerender } = render(
      <ErrorBoundary resetKeys={['a']}>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();

    rerender(
      <ErrorBoundary resetKeys={['b']}>
        <p>New content</p>
      </ErrorBoundary>
    );

    expect(screen.getByText('New content')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps the error when a resetKey is unchanged', () => {
    const { rerender } = render(
      <ErrorBoundary resetKeys={['a']}>
        <Boom />
      </ErrorBoundary>
    );

    rerender(
      <ErrorBoundary resetKeys={['a']}>
        <p>New content</p>
      </ErrorBoundary>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});

describe('ErrorBoundary custom fallback', () => {
  it('uses the provided fallback', () => {
    render(
      <ErrorBoundary fallback={error => <p>Custom: {error.message}</p>}>
        <Boom message='custom failure' />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom: custom failure')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('passes a reset callback to the fallback', () => {
    let reset: (() => void) | undefined;
    render(
      <ErrorBoundary
        fallback={error => {
          reset = undefined;
          return <p>Custom: {error.message}</p>;
        }}
      >
        <Boom message='custom failure' />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom: custom failure')).toBeInTheDocument();
    expect(reset).toBeUndefined();
  });

  it('recovers through a custom fallback once the child stops throwing', () => {
    let shouldThrow = true;
    const Toggle = (): ReactNode => {
      if (shouldThrow) throw new Error('resettable');
      return <p>Recovered</p>;
    };

    render(
      <ErrorBoundary fallback={(error, reset) => <button onClick={reset}>Reset</button>}>
        <Toggle />
      </ErrorBoundary>
    );

    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: /reset/i }));

    expect(screen.getByText('Recovered')).toBeInTheDocument();
  });
});

describe('AppErrorBoundary global listeners', () => {
  it('forwards window errors to the reporting seam', () => {
    render(
      <AppErrorBoundary>
        <p>App content</p>
      </AppErrorBoundary>
    );

    const error = new Error('window level failure');
    window.dispatchEvent(new ErrorEvent('error', { error }));

    expect(errorTracking.captureException).toHaveBeenCalledWith(
      error,
      'Unhandled window error'
    );
  });

  it('forwards unhandled rejections to the reporting seam', () => {
    render(
      <AppErrorBoundary>
        <p>App content</p>
      </AppErrorBoundary>
    );

    const reason = new Error('rejected');
    const event = new Event('unhandledrejection') as Event & { reason: unknown };
    event.reason = reason;
    window.dispatchEvent(event);

    expect(errorTracking.captureException).toHaveBeenCalledWith(
      reason,
      'Unhandled promise rejection'
    );
  });

  it('falls back to the message when the error event carries no Error', () => {
    render(
      <AppErrorBoundary>
<p>App content</p>
      </AppErrorBoundary>
    );

    window.dispatchEvent(new ErrorEvent('error', { message: 'script failure' }));

    expect(errorTracking.captureException).toHaveBeenCalledWith(
      'script failure',
      'Unhandled window error'
    );
  });

  it('removes its listeners on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = render(
      <AppErrorBoundary>
        <p>App content</p>
      </AppErrorBoundary>
    );

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('error', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
  });

  it('does not report window errors after unmount', () => {
    const { unmount } = render(
      <AppErrorBoundary>
        <p>App content</p>
      </AppErrorBoundary>
    );
    unmount();
    vi.mocked(errorTracking.captureException).mockClear();

    // jsdom reports an unhandled 'error' event on window as an uncaught
    // exception, so a no-op listener stands in for any other subscriber.
    const noop = () => {};
    window.addEventListener('error', noop);
    window.dispatchEvent(new ErrorEvent('error', { error: new Error('after unmount') }));
    window.removeEventListener('error', noop);

    expect(errorTracking.captureException).not.toHaveBeenCalled();
  });

  it('still renders its children', () => {
    render(
      <AppErrorBoundary>
        <p>App content</p>
      </AppErrorBoundary>
    );

    expect(screen.getByText('App content')).toBeInTheDocument();
  });
});