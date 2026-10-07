import { describe, expect, it } from 'vitest';
import {
  createChatroomSchema,
  getFieldError,
  hasFieldError,
  loginSchema,
  otpSchema,
  sanitizeChatroomTitle,
  sanitizeMessage,
  sanitizeOTP,
  sanitizePhoneNumber,
  searchSchema,
  validateCountryCode,
  validateImageFile,
  validateMessageContent,
  validateMessageFormData,
  validateOTP,
  validatePhoneNumber,
} from '@/lib/validations';

/** Builds a File with a controllable size, since jsdom sizes files by content length. */
function buildFile(name: string, type: string, size: number): File {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

function firstIssue(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.success ? undefined : result.error?.issues[0]?.message;
}

describe('loginSchema', () => {
  it('accepts a valid country code and phone number', () => {
    const result = loginSchema.safeParse({ countryCode: '+1', phoneNumber: '5551234567' });
    expect(result.success).toBe(true);
  });

  it('requires a country code', () => {
    const result = loginSchema.safeParse({ countryCode: '', phoneNumber: '5551234567' });
    expect(firstIssue(result)).toBe('Please select a country code');
  });

  it('rejects a country code without a leading plus', () => {
    const result = loginSchema.safeParse({ countryCode: '1', phoneNumber: '5551234567' });
    expect(firstIssue(result)).toBe('Invalid country code format');
  });

  it('rejects a phone number below the minimum length', () => {
    const result = loginSchema.safeParse({ countryCode: '+1', phoneNumber: '12345' });
    expect(firstIssue(result)).toBe('Phone number must be at least 6 digits');
  });

  it('rejects a phone number above the maximum length', () => {
    const result = loginSchema.safeParse({
      countryCode: '+1',
      phoneNumber: '1234567890123456',
    });
    expect(firstIssue(result)).toBe('Phone number must be at most 15 digits');
  });

  it('rejects non-digit phone numbers', () => {
    const result = loginSchema.safeParse({ countryCode: '+1', phoneNumber: '555abc123' });
    expect(firstIssue(result)).toBe('Phone number must contain only digits');
  });

  it('accepts the boundary lengths', () => {
    expect(loginSchema.safeParse({ countryCode: '+91', phoneNumber: '123456' }).success).toBe(true);
    expect(
      loginSchema.safeParse({ countryCode: '+91', phoneNumber: '123456789012345' }).success
    ).toBe(true);
  });
});

describe('otpSchema', () => {
  it('accepts exactly six digits', () => {
    expect(otpSchema.safeParse({ otp: '123456' }).success).toBe(true);
  });

  it('rejects a short code', () => {
    expect(firstIssue(otpSchema.safeParse({ otp: '12345' }))).toBe(
      'OTP must be exactly 6 digits'
    );
  });

  it('rejects a long code', () => {
    expect(firstIssue(otpSchema.safeParse({ otp: '1234567' }))).toBe(
      'OTP must be exactly 6 digits'
    );
  });

  it('rejects non-digit codes', () => {
    expect(otpSchema.safeParse({ otp: 'abcdef' }).success).toBe(false);
  });
});

describe('createChatroomSchema', () => {
  it('accepts a normal title', () => {
    expect(createChatroomSchema.safeParse({ title: 'My chat' }).success).toBe(true);
  });

  it('trims surrounding whitespace', () => {
    expect(createChatroomSchema.parse({ title: '  spaced  ' }).title).toBe('spaced');
  });

  it('rejects an empty title', () => {
    expect(firstIssue(createChatroomSchema.safeParse({ title: '   ' }))).toBe(
      'Chat title is required'
    );
  });

  it('rejects a title longer than 50 characters', () => {
    expect(firstIssue(createChatroomSchema.safeParse({ title: 'a'.repeat(51) }))).toBe(
      'Chat title must be at most 50 characters'
    );
  });

  it('defaults a missing title to empty before rejecting it', () => {
    expect(createChatroomSchema.safeParse({ title: undefined }).success).toBe(false);
  });
});

describe('searchSchema', () => {
  it('accepts an omitted query', () => {
    expect(searchSchema.safeParse({}).success).toBe(true);
  });

  it('rejects a query longer than 100 characters', () => {
    expect(firstIssue(searchSchema.safeParse({ query: 'a'.repeat(101) }))).toBe(
      'Search query must be at most 100 characters'
    );
  });
});

describe('validatePhoneNumber', () => {
  it.each([
    ['123456', true],
    ['123456789012345', true],
    ['12345', false],
    ['1234567890123456', false],
    ['+123456', false],
    ['12a456', false],
  ])('validatePhoneNumber(%s) === %s', (input, expected) => {
    expect(validatePhoneNumber(input)).toBe(expected);
  });
});

describe('validateOTP', () => {
  it('accepts six digits only', () => {
    expect(validateOTP('000000')).toBe(true);
    expect(validateOTP('12345')).toBe(false);
    expect(validateOTP('12345a')).toBe(false);
  });
});

describe('validateCountryCode', () => {
  it.each([
    ['+1', true],
    ['+91', true],
    ['+1234', true],
    ['+12345', false],
    ['1', false],
    ['++1', false],
    ['', false],
  ])('validateCountryCode(%s) === %s', (input, expected) => {
    expect(validateCountryCode(input)).toBe(expected);
  });
});

describe('validateImageFile', () => {
  it('accepts a valid image within limits', () => {
    expect(validateImageFile(buildFile('photo.png', 'image/png', 2048))).toEqual({
      isValid: true,
    });
  });

  it.each([
    ['image/jpeg', 'photo.jpeg'],
    ['image/jpg', 'photo.jpg'],
    ['image/png', 'photo.png'],
    ['image/gif', 'photo.gif'],
    ['image/webp', 'photo.webp'],
  ])('accepts the %s mime type', (type, name) => {
      expect(validateImageFile(buildFile(name, type, 2048)).isValid).toBe(true);
    }
  );

  it('rejects a disallowed mime type', () => {
    expect(validateImageFile(buildFile('notes.txt', 'text/plain', 2048))).toEqual({
      isValid: false,
      error: 'Only JPEG, PNG, GIF, and WebP images are allowed',
    });
  });

  it('rejects a file over 5MB', () => {
    expect(validateImageFile(buildFile('big.png', 'image/png', 5 * 1024 * 1024 + 1))).toEqual({
      isValid: false,
      error: 'Image size must be less than 5MB',
    });
  });

  it('accepts a file of exactly 5MB', () => {
    expect(validateImageFile(buildFile('big.png', 'image/png', 5 * 1024 * 1024)).isValid).toBe(
      true
    );
  });

  it('rejects a file under 100 bytes as corrupted', () => {
    expect(validateImageFile(buildFile('tiny.png', 'image/png', 99))).toEqual({
      isValid: false,
      error: 'Image file appears to be corrupted or too small',
    });
  });

  it('accepts a file of exactly 100 bytes', () => {
    expect(validateImageFile(buildFile('tiny.png', 'image/png', 100)).isValid).toBe(true);
  });

  it('rejects executable-looking extensions even with an image mime type', () => {
    expect(validateImageFile(buildFile('payload.exe', 'image/png', 2048))).toEqual({
      isValid: false,
      error: 'File appears to contain executable content',
    });
  });

  it('rejects an extension that disagrees with the mime type', () => {
    expect(validateImageFile(buildFile('photo.svg', 'image/png', 2048))).toEqual({
      isValid: false,
      error: 'File extension does not match allowed image types',
    });
  });

  it('treats a filename without an extension as a mismatching extension', () => {
    expect(validateImageFile(buildFile('photo', 'image/png', 2048))).toEqual({
      isValid: false,
      error: 'File extension does not match allowed image types',
    });
  });

  it('checks the mime type before the file size', () => {
    const result = validateImageFile(buildFile('huge.txt', 'text/plain', 50 * 1024 * 1024));
    expect(result.error).toBe('Only JPEG, PNG, GIF, and WebP images are allowed');
  });

  it('checks the size before the extension', () => {
    const result = validateImageFile(buildFile('huge.svg', 'image/png', 50 * 1024 * 1024));
    expect(result.error).toBe('Image size must be less than 5MB');
  });
});

describe('getFieldError / hasFieldError', () => {
  const errors = { phoneNumber: { message: 'Phone number must be at least 6 digits' } };

  it('returns the message for a known field', () => {
    expect(getFieldError(errors, 'phoneNumber')).toBe(
      'Phone number must be at least 6 digits'
    );
  });

  it('returns undefined for an unknown field', () => {
    expect(getFieldError(errors, 'otp')).toBeUndefined();
  });

  it('reports presence of an error', () => {
    expect(hasFieldError(errors, 'phoneNumber')).toBe(true);
    expect(hasFieldError(errors, 'otp')).toBe(false);
  });
});

describe('sanitizers', () => {
  it('strips non-digits from phone numbers', () => {
    expect(sanitizePhoneNumber('+1 (555) 123-4567')).toBe('15551234567');
  });

  it('strips non-digits from an OTP and caps it at six characters', () => {
    expect(sanitizeOTP('12a34b56c78d90')).toBe('123456');
  });

  it('trims chat titles and caps them at 50 characters', () => {
    expect(sanitizeChatroomTitle(`  ${'a'.repeat(60)}  `)).toBe('a'.repeat(50));
  });

  it('returns an empty string for a blank chat title', () => {
    expect(sanitizeChatroomTitle('   ')).toBe('');
  });

  it('trims messages and caps them at 1000 characters', () => {
    expect(sanitizeMessage(`  ${'a'.repeat(1200)}  `)).toBe('a'.repeat(1000));
  });

  it('returns an empty string for a blank message', () => {
    expect(sanitizeMessage('    ')).toBe('');
  });
});

describe('validateMessageContent', () => {
  it('treats an empty message as valid because an image may accompany it', () => {
    expect(validateMessageContent('')).toEqual({ isValid: true });
    expect(validateMessageContent('   ')).toEqual({ isValid: true });
  });

  it('accepts a normal message', () => {
    expect(validateMessageContent('Hello there')).toEqual({ isValid: true });
  });

  it('accepts a message of exactly 1000 characters', () => {
    expect(validateMessageContent('a'.repeat(1000)).isValid).toBe(true);
  });

  it('rejects a message over 1000 characters', () => {
    expect(validateMessageContent('a'.repeat(1001))).toEqual({
      isValid: false,
      error: 'Message must be at most 1000 characters',
    });
  });

  it.each([
    ['a script tag', '<script>alert(1)</script>'],
    ['an inline handler', '<img src=x onerror="steal()">'],
    ['a javascript uri', 'click javascript:alert(1)'],
    ['a data html uri', 'data:text/html;base64,PHNjcmlwdD4='],
  ])('rejects %s', (_label, content) => {
    expect(validateMessageContent(content)).toEqual({
      isValid: false,
      error: 'Message contains invalid content',
    });
  });

  it('allows the word "script" when it is not a tag', () => {
    expect(validateMessageContent('I wrote a script yesterday').isValid).toBe(true);
  });

  it('measures length after trimming', () => {
    const padded = `   ${'a'.repeat(1001)}   `;
    expect(validateMessageContent(padded).isValid).toBe(false);
  });
});

describe('validateMessageFormData', () => {
  it('accepts a text-only message', () => {
    expect(validateMessageFormData({ content: 'Hello world' })).toEqual({
      isValid: true,
      errors: {},
    });
  });

  it('accepts an image-only message', () => {
    const image = buildFile('photo.png', 'image/png', 2048);
    expect(validateMessageFormData({ content: '', image })).toEqual({
      isValid: true,
      errors: {},
    });
  });

  it('accepts an empty content when an image is present', () => {
    const image = buildFile('photo.png', 'image/png', 2048);
    expect(validateMessageFormData({ content: '   ', image }).isValid).toBe(true);
  });

  it('requires either content or an image', () => {
    expect(validateMessageFormData({ content: '' })).toEqual({
      isValid: false,
      errors: { general: 'Please provide either a message or an image' },
    });
  });

  it('treats whitespace-only content with no image as empty', () => {
    expect(validateMessageFormData({ content: '    ' }).errors.general).toBe(
      'Please provide either a message or an image'
    );
  });

  it('reports an over-long message', () => {
    const result = validateMessageFormData({ content: 'a'.repeat(1001) });
    expect(result.isValid).toBe(false);
    expect(result.errors.content).toBe('Message must be at most 1000 characters');
  });

  it('reports suspicious content', () => {
    const result = validateMessageFormData({
      content: '<script>alert("xss")</script>',
    });
    expect(result.errors.content).toBe('Message contains invalid content');
  });

  it('reports an invalid image', () => {
    const result = validateMessageFormData({
      content: 'look at this',
      image: buildFile('notes.txt', 'text/plain', 2048),
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.image).toBe('Only JPEG, PNG, GIF, and WebP images are allowed');
  });

  it('collects content and image errors together', () => {
    const result = validateMessageFormData({
      content: 'a'.repeat(1001),
      image: buildFile('photo.png', 'image/png', 1),
    });
    expect(result.errors).toEqual({
      content: 'Message must be at most 1000 characters',
      image: 'Image file appears to be corrupted or too small',
    });
  });

  it('ignores an undefined image field', () => {
    expect(validateMessageFormData({ content: 'hi', image: undefined }).isValid).toBe(true);
  });
});