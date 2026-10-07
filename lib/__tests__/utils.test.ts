import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import {
  cn,
  copyToClipboard,
  debounce,
  filterChatrooms,
  formatChatroomTime,
  formatFileSize,
  formatMessageTime,
  formatPhoneNumber,
  generateId,
  getCountryFlag,
  isAtBottom,
  isValidImageFile,
  isValidOTP,
  isValidPhoneNumber,
  scrollToBottom,
  truncateText,
} from '@/lib/utils';
import type { Chatroom } from '@/types';

function makeChatroom(overrides: Partial<Chatroom> = {}): Chatroom {
  return {
    id: 'chatroom_1',
    title: 'Test chat',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    messageCount: 0,
    ...overrides,
  };
}

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('drops falsy values', () => {
    expect(cn('a', false, undefined, null, 'b')).toBe('a b');
  });
});

describe('formatPhoneNumber', () => {
  it('joins country code and phone number', () => {
    expect(formatPhoneNumber('+1', '5551234567')).toBe('+1 5551234567');
  });
});

describe('formatMessageTime', () => {
  it('returns "Just now" for messages under a minute old', () => {
    const timestamp = new Date(Date.now() - 30 * 1000);
    expect(formatMessageTime(timestamp)).toBe('Just now');
  });

  it('returns minutes for messages under an hour old', () => {
    const timestamp = new Date(Date.now() - 5 * 60 * 1000);
    expect(formatMessageTime(timestamp)).toBe('5m ago');
  });

  it('returns hours for messages under a day old', () => {
    const timestamp = new Date(Date.now() - 3 * 60 * 60 * 1000);
    expect(formatMessageTime(timestamp)).toBe('3h ago');
  });

  it('falls back to a date for messages older than a day', () => {
    const timestamp = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    expect(formatMessageTime(timestamp)).toBe(timestamp.toLocaleDateString());
  });
});

describe('formatChatroomTime', () => {
  it('returns a time for today', () => {
    const date = new Date(Date.now() - 60 * 1000);
    expect(formatChatroomTime(date)).toBe(
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
  });

  it('returns "Yesterday" for one day old', () => {
    const date = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(formatChatroomTime(date)).toBe('Yesterday');
  });

  it('returns a weekday for 2-6 days old', () => {
    const date = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    expect(formatChatroomTime(date)).toBe(
      date.toLocaleDateString([], { weekday: 'short' })
    );
  });

  it('returns month and day beyond a week', () => {
    const date = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
    expect(formatChatroomTime(date)).toBe(
      date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    );
  });
});

describe('debounce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('invokes the function once after the wait period', () => {
    const spy = vi.fn();
    const debounced = debounce(spy, 300);

    debounced('a');
    debounced('b');
    debounced('c');

    expect(spy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('c');
  });

  it('does not fire when calls are spaced beyond the wait', () => {
    const spy = vi.fn();
    const debounced = debounce(spy, 100);

    debounced('first');
    vi.advanceTimersByTime(150);
    debounced('second');
    vi.advanceTimersByTime(100);

    expect(spy).toHaveBeenCalledTimes(2);
  });
});

describe('copyToClipboard', () => {
  const originalSecureContext = window.isSecureContext;

  afterEach(() => {
    Object.defineProperty(window, 'isSecureContext', {
      value: originalSecureContext,
      configurable: true,
    });
    vi.unstubAllGlobals();
  });

  it('uses the async clipboard API in a secure context', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    Object.defineProperty(window, 'isSecureContext', {
      value: true,
      configurable: true,
    });

    await expect(copyToClipboard('hello')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello');
  });

  it('falls back to execCommand when the clipboard API is unavailable', async () => {
    vi.stubGlobal('navigator', { clipboard: undefined });
    Object.defineProperty(window, 'isSecureContext', {
      value: false,
      configurable: true,
    });
    document.execCommand = vi.fn().mockReturnValue(true);

    await expect(copyToClipboard('fallback')).resolves.toBe(true);
    expect(document.execCommand).toHaveBeenCalledWith('copy');
    // The temporary textarea must not be left in the DOM.
    expect(document.querySelectorAll('textarea')).toHaveLength(0);
  });

  it('reports failure when the clipboard write rejects', async () => {
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    Object.defineProperty(window, 'isSecureContext', {
      value: true,
      configurable: true,
    });

    await expect(copyToClipboard('nope')).resolves.toBe(false);
  });
});

describe('isValidPhoneNumber', () => {
  it.each([
    ['123456', true],
    ['123456789012345', true],
    ['12345', false],
    ['1234567890123456', false],
    ['12345a', false],
    ['', false],
  ])('returns %s -> %s', (input, expected) => {
    expect(isValidPhoneNumber(input)).toBe(expected);
  });
});

describe('isValidOTP', () => {
  it('accepts exactly six digits', () => {
    expect(isValidOTP('123456')).toBe(true);
  });

  it('rejects wrong lengths and non-digits', () => {
    expect(isValidOTP('12345')).toBe(false);
    expect(isValidOTP('1234567')).toBe(false);
    expect(isValidOTP('12a456')).toBe(false);
  });
});

describe('generateId', () => {
  it('prefixes the id when a prefix is provided', () => {
    expect(generateId('toast')).toMatch(/^toast_[a-z0-9]+_[a-z0-9]+$/);
  });

  it('omits the prefix segment when no prefix is given', () => {
    const id = generateId();
    expect(id.split('_')).toHaveLength(2);
    expect(id).toMatch(/^[a-z0-9]+_[a-z0-9]+$/);
  });

  it('generates unique ids', () => {
    const ids = new Set(Array.from({ length: 500 }, () => generateId('x')));
    expect(ids.size).toBe(500);
  });
});

describe('truncateText', () => {
  it('returns short text untouched', () => {
    expect(truncateText('short', 50)).toBe('short');
  });

  it('truncates with an ellipsis', () => {
    expect(truncateText('a'.repeat(60), 50)).toBe(`${'a'.repeat(47)}...`);
  });

  it('returns text of exactly maxLength untouched', () => {
    expect(truncateText('a'.repeat(50), 50)).toBe('a'.repeat(50));
  });
});

describe('isValidImageFile', () => {
  const buildFile = (type: string, size: number) => {
    const file = new File(['x'], 'test', { type });
    Object.defineProperty(file, 'size', { value: size });
    return file;
  };

  it('accepts allowed types within the size limit', () => {
    expect(isValidImageFile(buildFile('image/png', 1024))).toBe(true);
  });

  it('rejects disallowed types', () => {
    expect(isValidImageFile(buildFile('text/plain', 1024))).toBe(false);
  });

  it('rejects files over 5MB', () => {
    expect(isValidImageFile(buildFile('image/png', 5 * 1024 * 1024 + 1))).toBe(false);
  });
});

describe('formatFileSize', () => {
  it.each([
    [0, '0 Bytes'],
    [512, '512 Bytes'],
    [1024, '1 KB'],
    [1536, '1.5 KB'],
    [1024 * 1024, '1 MB'],
    [1024 * 1024 * 1024, '1 GB'],
  ])('formats %i bytes as %s', (bytes, expected) => {
    expect(formatFileSize(bytes)).toBe(expected);
  });
});

describe('getCountryFlag', () => {
  it('converts a country code to its flag emoji', () => {
    expect(getCountryFlag('US')).toBe('\u{1F1FA}\u{1F1F8}');
  });

  it('is case insensitive', () => {
    expect(getCountryFlag('us')).toBe(getCountryFlag('US'));
  });
});

describe('filterChatrooms', () => {
  const chatrooms = [
    makeChatroom({
      id: 'a',
      title: 'React Patterns',
      lastMessage: {
        id: 'm1',
        content: 'Hooks explained',
        type: 'text',
        sender: 'ai',
        timestamp: new Date(),
        chatroomId: 'a',
      },
    }),
    makeChatroom({ id: 'b', title: 'Rust Ownership' }),
  ];

  it('returns everything for an empty query', () => {
    expect(filterChatrooms(chatrooms, '')).toHaveLength(2);
    expect(filterChatrooms(chatrooms, '   ')).toHaveLength(2);
  });

  it('matches on the title case-insensitively', () => {
    const result = filterChatrooms(chatrooms, 'react');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a');
  });

  it('matches on the last message content', () => {
    const result = filterChatrooms(chatrooms, 'hooks');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a');
  });

  it('returns an empty array when nothing matches', () => {
    expect(filterChatrooms(chatrooms, 'kubernetes')).toHaveLength(0);
  });
});

describe('scrollToBottom', () => {
  it('scrolls smoothly by default', () => {
    const element = document.createElement('div');
    const scrollTo = vi.fn();
    Object.defineProperty(element, 'scrollTo', { value: scrollTo });
    Object.defineProperty(element, 'scrollHeight', { value: 1000 });

    scrollToBottom(element);

    expect(scrollTo).toHaveBeenCalledWith({ top: 1000, behavior: 'smooth' });
  });

  it('scrolls instantly when smooth is false', () => {
    const element = document.createElement('div');
    const scrollTo = vi.fn();
    Object.defineProperty(element, 'scrollTo', { value: scrollTo });
    Object.defineProperty(element, 'scrollHeight', { value: 500 });

    scrollToBottom(element, false);

    expect(scrollTo).toHaveBeenCalledWith({ top: 500, behavior: 'auto' });
  });
});

describe('isAtBottom', () => {
  const buildElement = (scrollHeight: number, scrollTop: number, clientHeight: number) => {
    const element = document.createElement('div');
    Object.defineProperty(element, 'scrollHeight', { value: scrollHeight });
    Object.defineProperty(element, 'scrollTop', { value: scrollTop });
    Object.defineProperty(element, 'clientHeight', { value: clientHeight });
    return element;
  };

  it('returns true when fully scrolled to the bottom', () => {
    expect(isAtBottom(buildElement(1000, 800, 200))).toBe(true);
  });

  it('returns false when scrolled far from the bottom', () => {
    expect(isAtBottom(buildElement(1000, 0, 200))).toBe(false);
  });

  it('respects the threshold', () => {
    // 1000 - 750 - 200 = 50px from the bottom
    expect(isAtBottom(buildElement(1000, 750, 200), 100)).toBe(true);
    // 1000 - 600 - 200 = 200px from the bottom
    expect(isAtBottom(buildElement(1000, 600, 200), 100)).toBe(false);
  });
});