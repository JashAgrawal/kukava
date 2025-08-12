import { z } from 'zod';

// Login form validation schema
export const loginSchema = z.object({
  countryCode: z
    .string()
    .min(1, 'Please select a country code')
    .regex(/^\+\d{1,4}$/, 'Invalid country code format'),
  phoneNumber: z
    .string()
    .min(6, 'Phone number must be at least 6 digits')
    .max(15, 'Phone number must be at most 15 digits')
    .regex(/^\d+$/, 'Phone number must contain only digits')
    .refine((val) => val.length >= 6 && val.length <= 15, {
      message: 'Phone number must be between 6 and 15 digits',
    }),
});

// OTP verification form validation schema
export const otpSchema = z.object({
  otp: z
    .string()
    .length(6, 'OTP must be exactly 6 digits')
    .regex(/^\d{6}$/, 'OTP must contain only digits'),
});

// Create chatroom form validation schema
export const createChatroomSchema = z.object({
  title: z
    .string()
    .default('')
    .transform((val) => val?.trim() || '')
    .refine((val) => val.length > 0, 'Chat title is required')
    .refine((val) => val.length <= 50, 'Chat title must be at most 50 characters'),
});

// Enhanced message form validation schema
export const messageSchema = z.object({
  content: z
    .string()
    .max(1000, 'Message must be at most 1000 characters')
    .refine((val) => {
      // Check for potentially harmful content patterns
      const suspiciousPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi
      ];
      return !suspiciousPatterns.some(pattern => pattern.test(val || ''));
    }, 'Message contains invalid content')
    .default(''),
    // ,
  image: z
    .instanceof(File)
    .optional()
    .refine(
      (file) => {
        if (!file) return true;
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        return validTypes.includes(file.type);
      },
      {
        message: 'Only JPEG, PNG, GIF, and WebP images are allowed',
      }
    )
    .refine(
      (file) => {
        if (!file) return true;
        const maxSize = 5 * 1024 * 1024; // 5MB
        return file.size <= maxSize;
      },
      {
        message: 'Image size must be less than 5MB',
      }
    )
    .refine(
      (file) => {
        if (!file) return true;
        const minSize = 100; // 100 bytes minimum
        return file.size >= minSize;
      },
      {
        message: 'Image file appears to be corrupted or too small',
      }
    ),
});

// Note: The "at least one field required" validation is handled in the component
// to provide better user experience and avoid conflicts with form submission

// Search form validation schema
export const searchSchema = z.object({
  query: z
    .string()
    .max(100, 'Search query must be at most 100 characters')
    .optional(),
});

// Type exports for form data
export type LoginFormData = z.infer<typeof loginSchema>;
export type OTPFormData = z.infer<typeof otpSchema>;
export type CreateChatroomFormData = z.infer<typeof createChatroomSchema>;
export type MessageFormData = z.infer<typeof messageSchema>;
export type SearchFormData = z.infer<typeof searchSchema>;

// Custom validation functions
export const validatePhoneNumber = (phoneNumber: string): boolean => {
  const phoneRegex = /^\d{6,15}$/;
  return phoneRegex.test(phoneNumber);
};

export const validateOTP = (otp: string): boolean => {
  const otpRegex = /^\d{6}$/;
  return otpRegex.test(otp);
};

export const validateCountryCode = (countryCode: string): boolean => {
  const countryCodeRegex = /^\+\d{1,4}$/;
  return countryCodeRegex.test(countryCode);
};

export const validateImageFile = (file: File): { isValid: boolean; error?: string } => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB
  const minSize = 100; // 100 bytes minimum

  // Check file type
  if (!validTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Only JPEG, PNG, GIF, and WebP images are allowed',
    };
  }

  // Check file size limits
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'Image size must be less than 5MB',
    };
  }

  if (file.size < minSize) {
    return {
      isValid: false,
      error: 'Image file appears to be corrupted or too small',
    };
  }

  // Check file name for suspicious patterns
  const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com'];
  const fileName = file.name.toLowerCase();
  if (suspiciousExtensions.some(ext => fileName.includes(ext))) {
    return {
      isValid: false,
      error: 'File appears to contain executable content',
    };
  }

  // Additional MIME type validation (some browsers might allow spoofed types)
  const fileExtension = fileName.split('.').pop()?.toLowerCase();
  const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  if (fileExtension && !validExtensions.includes(fileExtension)) {
    return {
      isValid: false,
      error: 'File extension does not match allowed image types',
    };
  }

  return { isValid: true };
};

// Form field validation helpers
export const getFieldError = (errors: any, fieldName: string): string | undefined => {
  return errors[fieldName]?.message;
};

export const hasFieldError = (errors: any, fieldName: string): boolean => {
  return !!errors[fieldName];
};

// Sanitize input functions
export const sanitizePhoneNumber = (phoneNumber: string): string => {
  return phoneNumber.replace(/\D/g, ''); // Remove all non-digit characters
};

export const sanitizeOTP = (otp: string): string => {
  return otp.replace(/\D/g, '').slice(0, 6); // Remove non-digits and limit to 6 characters
};

export const sanitizeChatroomTitle = (title: string): string => {
  return (title?.trim() || '').slice(0, 50); // Trim whitespace and limit to 50 characters
};

export const sanitizeMessage = (message: string): string => {
  return (message?.trim() || '').slice(0, 1000); // Trim whitespace and limit to 1000 characters
};

// Enhanced message content validation
export const validateMessageContent = (content: string): { isValid: boolean; error?: string } => {
  const trimmed = content?.trim() || '';

  if (trimmed.length === 0) {
    return { isValid: true }; // Empty content is valid if image is provided
  }

  if (trimmed.length > 1000) {
    return {
      isValid: false,
      error: 'Message must be at most 1000 characters',
    };
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /data:text\/html/gi,
  ];

  if (suspiciousPatterns.some(pattern => pattern.test(trimmed))) {
    return {
      isValid: false,
      error: 'Message contains invalid content',
    };
  }

  return { isValid: true };
};

// Validate complete message form data
export const validateMessageFormData = (data: { content: string; image?: File }): {
  isValid: boolean;
  errors: { content?: string; image?: string; general?: string }
} => {
  const errors: { content?: string; image?: string; general?: string } = {};

  // Validate content
  const contentValidation = validateMessageContent(data.content);
  if (!contentValidation.isValid) {
    errors.content = contentValidation.error;
  }

  // Validate image
  if (data.image) {
    const imageValidation = validateImageFile(data.image);
    if (!imageValidation.isValid) {
      errors.image = imageValidation.error;
    }
  }

  // Check if at least one field has content
  const hasContent = data.content?.trim().length > 0;
  const hasImage = data.image instanceof File;

  if (!hasContent && !hasImage) {
    errors.general = 'Please provide either a message or an image';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
