import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  describeError,
  getLogLevel,
  logger,
  redact,
  setLogLevel,
  type LogRecord,
} from '@/lib/logger';

type Sink = ReturnType<typeof vi.spyOn>;

let log: Sink;
let warn: Sink;
let error: Sink;

/** Parses the single JSON line each log call writes. */
function records(sink: Sink): LogRecord[] {
  return sink.mock.calls
    .map(args => {
      try {
        return JSON.parse(String(args[0])) as LogRecord;
      } catch {
        return null;
      }
    })
    .filter((entry): entry is LogRecord => entry !== null);
}

beforeEach(() => {
  setLogLevel('debug');
  log = vi.spyOn(console, 'log').mockImplementation(() => {});
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  error = vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
});

afterEach(() => {
  setLogLevel('debug');
  vi.useRealTimers();
});

describe('log formatting', () => {
  it('writes a single JSON line per record', () => {
    logger.info('chat.message_sent', { room: 'chatroom_1' });

    expect(log).toHaveBeenCalledTimes(1);
    const [line] = log.mock.calls[0];
    expect(line).not.toContain('\n');
  });

  it('includes a level, message and ISO timestamp', () => {
    logger.info('chat.message_sent');

    expect(records(log)[0]).toEqual({
      timestamp: '2024-01-01T00:00:00.000Z',
      level: 'info',
      message: 'chat.message_sent',
    });
  });

  it('attaches context when present', () => {
    logger.debug('scroll.triggered', { scrollTop: 10 });

    expect(records(log)[0].context).toEqual({ scrollTop: 10 });
  });

  it('omits an empty context object', () => {
    logger.info('no.context', {});

    expect(records(log)[0].context).toBeUndefined();
  });

  it('serialises nested context', () => {
    logger.debug('nested', { user: { id: 'user_1' }, count: 3 });

    expect(records(log)[0].context).toEqual({ user: { id: 'user_1' }, count: 3 });
  });

  it('routes each level to the matching console method', () => {
    logger.debug('a');
    logger.info('b');
    logger.warn('c');
    logger.error('d');

    expect(log).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);
  });
});

describe('level thresholds', () => {
  it('emits everything at debug', () => {
    setLogLevel('debug');
    logger.debug('a');
    logger.error('b');

    expect(log).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);
  });

  it('drops debug below info', () => {
    setLogLevel('info');
    logger.debug('dropped');
    logger.info('kept');

    expect(log).toHaveBeenCalledTimes(1);
    expect(records(log)[0].message).toBe('kept');
  });

  it('drops info and debug below warn', () => {
    setLogLevel('warn');
    logger.debug('dropped');
    logger.info('dropped');
    logger.warn('kept');

    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('only emits errors when silent is off but error is the floor', () => {
    setLogLevel('error');
    logger.warn('dropped');
    logger.error('kept');

    expect(warn).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledTimes(1);
  });

  it('emits nothing at all when silent', () => {
    setLogLevel('silent');
    logger.debug('a');
    logger.info('b');
    logger.warn('c');
    logger.error('d');

    expect(log).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it('reports the active level', () => {
    setLogLevel('warn');
    expect(getLogLevel()).toBe('warn');
  });
});

describe('redaction', () => {
  it.each([
    'password',
    'otp',
    'token',
    'accessToken',
    'refreshToken',
    'authorization',
    'cookie',
    'secret',
    'phoneNumber',
    'countryCode',
  ])('redacts %s regardless of case', key => {
    expect(redact({ [key]: 'sensitive' })[key]).toBe('[redacted]');
  });

  it('leaves ordinary fields alone', () => {
    expect(redact({ room: 'chatroom_1', count: 4 })).toEqual({
      room: 'chatroom_1',
      count: 4,
    });
  });

  it('does not mutate the caller object', () => {
    const context = { otp: '123456' };
    redact(context);

    expect(context.otp).toBe('123456');
  });

  it('redacts on the way out', () => {
    logger.info('auth.login', { otp: '123456', room: 'chatroom_1' });

    const [line] = log.mock.calls[0];
    expect(line).not.toContain('123456');
    expect(records(log)[0].context).toEqual({ otp: '[redacted]', room: 'chatroom_1' });
  });
});

describe('describeError', () => {
  it('lifts name, message and stack off an Error', () => {
    const original = new Error('boom');
    const described = describeError(original);

    expect(described.errorName).toBe('Error');
    expect(described.errorMessage).toBe('boom');
    expect(described.errorStack).toBe(original.stack);
  });

  it('reports a custom error name', () => {
    class HttpError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'HttpError';
      }
    }
    const described = describeError(new HttpError('failed'));

    expect(described.errorName).toBe('HttpError');
    expect(described.errorMessage).toBe('failed');
  });

  it('stringifies a non-Error rejection', () => {
    expect(describeError('just a string')).toEqual({ errorMessage: 'just a string' });
  });

  it('handles a null rejection', () => {
    expect(describeError(null)).toEqual({ errorMessage: 'null' });
  });

  it('handles an undefined rejection', () => {
    expect(describeError(undefined)).toEqual({ errorMessage: 'undefined' });
  });
});

describe('logger.fromError', () => {
  it('reports an Error with full detail', () => {
    logger.fromError('send.failed', new Error('offline'), { room: 'chatroom_1' });

    const [record] = records(error);
    expect(record.level).toBe('error');
    expect(record.message).toBe('send.failed');
    expect(record.context).toMatchObject({
      room: 'chatroom_1',
      errorName: 'Error',
      errorMessage: 'offline',
    });
  });

  it('reports a non-Error rejection', () => {
    logger.fromError('send.failed', 'string rejection');

    expect(records(error)[0].context).toMatchObject({ errorMessage: 'string rejection' });
  });

  it('works without context', () => {
    logger.fromError('send.failed', new Error('offline'));

    expect(records(error)[0].context).toMatchObject({ errorMessage: 'offline' });
  });

  it('is suppressed below the threshold like any other level', () => {
    setLogLevel('silent');
    logger.fromError('send.failed', new Error('offline'));

    expect(error).not.toHaveBeenCalled();
  });
});