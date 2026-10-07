/**
 * Error tracking.
 *
 * `captureException` is the single seam every error report flows through. By
 * default it writes a structured entry through the logger; setting
 * `NEXT_PUBLIC_SENTRY_DSN` (plus the optional release and environment) switches
 * it to a Sentry-compatible transport without any call site changing.
 *
 * The point is that call sites never need to know which backend is in use, and
 * a backend can be swapped in without touching application code.
 */

import { describeError, logger } from '@/lib/logger';
import type { LogContext } from '@/lib/logger';

export interface CapturedError {
  message: string;
  timestamp: string;
  context?: LogContext;
  reported: 'logged' | 'remote' | 'discarded';
}

type Transport = (payload: CapturedError) => void | Promise<void>;

let transport: Transport | null = null;

/** Reports that reached the network are held for inspection in tests. */
export const reportedErrors: CapturedError[] = [];

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

function sendToSentry(payload: CapturedError): void {
  if (!dsn) return;
  // The endpoint shape is what Sentry's ingestion API expects; using fetch keeps
  // the dependency surface at zero. Failures here must never propagate.
  void fetch(`${dsn.replace(/\/$/, '')}/envelope`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(error => {
    logger.fromError('Error tracking delivery failed', error);
  });
}

transport = dsn
  ? payload => {
      const remote: CapturedError = { ...payload, reported: 'remote' };
      reportedErrors.push(remote);
      sendToSentry(remote);
    }
  : payload => {
      reportedErrors.push(payload);
      logger.error(payload.message, payload.context);
    };

export function setErrorTransport(next: Transport | null): void {
  transport = next;
}

export function captureException(
  error: unknown,
  message = 'Unhandled error',
  context?: LogContext
): void {
  const payload: CapturedError = {
    message,
    timestamp: new Date().toISOString(),
    ...(context && Object.keys(context).length > 0 ? { context } : {}),
    reported: 'logged',
  };

  if (!transport) {
    // No transport configured: still log, so the failure is never silent.
    logger.fromError(message, error, context);
    return;
  }

  try {
    void transport(payload);
  } catch (transportError) {
    logger.fromError('Error transport threw', transportError, { message });
  }
}

/** For non-fatal problems worth reporting without an exception. */
export function captureMessage(message: string, context?: LogContext): void {
  captureException(new Error(message), message, context);
}

export { describeError };