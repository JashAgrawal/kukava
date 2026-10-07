import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  captureException,
  captureMessage,
  reportedErrors,
  setErrorTransport,
} from '@/lib/errorTracking';

let error: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  reportedErrors.length = 0;
  error = vi.spyOn(console, 'error').mockImplementation(() => {});
  // Restore whatever the module picked at import time.
  setErrorTransport(null);
  vi.resetModules();
});

afterEach(() => {
  setErrorTransport(null);
  vi.restoreAllMocks();
});

describe('captureException', () => {
  it('logs the failure when no remote transport is configured', () => {
    captureException(new Error('boom'), 'send.failed', { room: 'chatroom_1' });

    expect(error).toHaveBeenCalledTimes(1);
    const record = JSON.parse(String(error.mock.calls[0][0]));
    expect(record.level).toBe('error');
    expect(record.message).toBe('send.failed');
    expect(record.context).toMatchObject({
      room: 'chatroom_1',
      errorMessage: 'boom',
    });
  });

  it('defaults the message', () => {
    captureException(new Error('boom'));

    expect(JSON.parse(String(error.mock.calls[0][0])).message).toBe('Unhandled error');
  });

  it('handles a non-Error rejection', () => {
    captureException('string rejection', 'send.failed');

    expect(JSON.parse(String(error.mock.calls[0][0])).context).toMatchObject({
      errorMessage: 'string rejection',
    });
  });

  it('stamps the payload with a timestamp', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    const seen: { timestamp: string }[] = [];
    setErrorTransport(payload => {
      seen.push(payload);
    });

    captureException(new Error('boom'));

    expect(seen[0].timestamp).toBe('2024-01-01T00:00:00.000Z');
    vi.useRealTimers();
  });

  it('never lets a throwing transport escape', () => {
    setErrorTransport(() => {
      throw new Error('transport is down');
    });

    expect(() => captureException(new Error('boom'))).not.toThrow();
    // The failure is reported rather than swallowed.
    expect(error).toHaveBeenCalled();
  });

  it('falls back to logging when the transport is removed', () => {
    setErrorTransport(null);

    captureException(new Error('boom'), 'send.failed');

    expect(error).toHaveBeenCalledTimes(1);
  });

  it('passes the context through to a custom transport', () => {
    const payloads: { context?: Record<string, unknown> }[] = [];
    setErrorTransport(payload => {
      payloads.push(payload);
    });

    captureException(new Error('boom'), 'send.failed', { chatroomId: 'room_1' });

    expect(payloads[0].context).toEqual({ chatroomId: 'room_1' });
  });

  it('supports async transports', async () => {
    const delivered: string[] = [];
    setErrorTransport(async payload => {
      delivered.push(payload.message);
    });

    captureException(new Error('boom'), 'async.failed');

    await Promise.resolve();
    expect(delivered).toEqual(['async.failed']);
  });
});

describe('captureMessage', () => {
  it('reports a non-fatal message as an error entry', () => {
    captureMessage('network slow', { room: 'chatroom_1' });

    const record = JSON.parse(String(error.mock.calls[0][0]));
    expect(record.message).toBe('network slow');
    expect(record.context).toMatchObject({ room: 'chatroom_1' });
  });

  it('always carries the synthesised error detail', () => {
    captureMessage('network slow');

    const record = JSON.parse(String(error.mock.calls[0][0]));
    expect(record.context).toMatchObject({
      errorName: 'Error',
      errorMessage: 'network slow',
    });
  });
});