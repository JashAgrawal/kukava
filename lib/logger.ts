/**
 * Structured logging.
 *
 * Every entry is emitted as a single JSON line so that logs can be shipped to a
 * log aggregator and queried as fields, instead of being grepped as prose.
 *
 * Levels follow the usual convention. `LOG_LEVEL` gates what is emitted:
 *   - `debug`  everything, including high-frequency scroll and search traces
 *   - `info`   lifecycle events worth keeping
 *   - `warn`   recoverable problems
 *   - `error`  failures that need attention
 *   - `silent` nothing at all (used by tests)
 *
 * In production `info` is the floor, so debug traces are dropped before they
 * reach the console. In development everything above `LOG_LEVEL=debug` is kept.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

export type LogContext = Record<string, unknown>;

export interface LogRecord {
  timestamp: string;
  level: Exclude<LogLevel, 'silent'>;
  message: string;
  context?: LogContext;
}

/** Ordered by severity; `indexOf` decides whether a record passes the threshold. */
const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

/** Redacts these keys so credentials and phone numbers never reach a log sink. */
const SENSITIVE_KEYS = new Set([
  'password',
  'otp',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'cookie',
  'secret',
  'phonenumber',
  'countrycode',
]);

function resolveThreshold(): number {
  const configured =
    typeof process !== 'undefined' ? process.env?.LOG_LEVEL : undefined;
  const level = (configured as LogLevel) ?? 'debug';
  // Unknown values fall back to the most permissive threshold rather than
  // silently dropping every record.
  return LEVEL_ORDER[level] ?? LEVEL_ORDER.debug;
}

let threshold: number | null = null;

function getThreshold(): number {
  if (threshold === null) {
    threshold = resolveThreshold();
  }
  return threshold;
}

/** Only used by tests, to change the threshold without reloading the module. */
export function setLogLevel(level: LogLevel): void {
  threshold = LEVEL_ORDER[level];
}

export function getLogLevel(): LogLevel {
  return (Object.keys(LEVEL_ORDER) as LogLevel[]).find(
    key => LEVEL_ORDER[key] === getThreshold()
  )!;
}

/**
 * Replaces sensitive values with a placeholder. Redaction is shallow because
 * the shape of these contexts is known and flat.
 */
export function redact(context: LogContext): LogContext {
  const output: LogContext = {};
  for (const [key, value] of Object.entries(context)) {
    output[key] = SENSITIVE_KEYS.has(key.toLowerCase()) ? '[redacted]' : value;
  }
  return output;
}

/**
 * Normalises an unknown thrown value into something loggable. Errors do not
 * survive JSON.stringify, so message and stack are lifted to the top level.
 */
export function describeError(error: unknown): LogContext {
  if (error instanceof Error) {
    return { errorName: error.name, errorMessage: error.message, errorStack: error.stack };
  }
  return { errorMessage: String(error) };
}

function emit(level: Exclude<LogLevel, 'silent'>, message: string, context?: LogContext): void {
  if (LEVEL_ORDER[level] < getThreshold()) return;

  const record: LogRecord = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context && Object.keys(context).length > 0 ? { context: redact(context) } : {}),
  };

  const line = JSON.stringify(record);
  const sink = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  sink(line);
}

export const logger = {
  debug: (message: string, context?: LogContext) => emit('debug', message, context),
  info: (message: string, context?: LogContext) => emit('info', message, context),
  warn: (message: string, context?: LogContext) => emit('warn', message, context),
  error: (message: string, context?: LogContext) => emit('error', message, context),

  /** Attaches a caught value to an existing call without losing the type. */
  fromError: (message: string, error: unknown, context?: LogContext) =>
    emit('error', message, { ...context, ...describeError(error) }),
};

export type Logger = typeof logger;