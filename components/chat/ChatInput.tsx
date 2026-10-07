'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import NextImage from 'next/image';
import { Send, Image, X, Loader2, AlertCircle, FileImage } from 'lucide-react';
import { MessageFormData, validateMessageFormData, validateImageFile } from '@/lib/validations';
import { useUIStore } from '@/stores/uiStore';
import { cn, formatFileSize } from '@/lib/utils';

interface ChatInputProps {
  onSendMessage: (data: MessageFormData) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
}

interface FormState {
  content: string;
  image: File | null;
}

interface ValidationErrors {
  content?: string;
  image?: string;
  general?: string;
}

export function ChatInput({
  onSendMessage,
  disabled = false,
  placeholder = 'Type your message...',
  maxLength = 1000,
}: ChatInputProps) {
  const { showToast } = useUIStore();

  // Core state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formState, setFormState] = useState<FormState>({
    content: '',
    image: null,
  });
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  // UI state
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isComposing, setIsComposing] = useState(false);

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Computed values
  const contentLength = formState.content.length;
  const hasContent = formState.content.trim().length > 0;
  const hasImage = formState.image !== null;
  const hasValidationErrors = Object.keys(validationErrors).length > 0;

  // Auto-resize textarea with mobile optimization
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      // Responsive max height: smaller on mobile
      const maxHeight = window.innerWidth < 640 ? 100 : 120;
      textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    }
  }, [formState.content]);

  // Focus textarea on mount
  useEffect(() => {
    if (textareaRef.current && !disabled) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  // Clear validation errors when form state changes
  useEffect(() => {
    if (hasValidationErrors) {
      setValidationErrors({});
    }
  }, [formState.content, formState.image, hasValidationErrors]);

  // Validate form data
  const validateForm = useCallback((): boolean => {
    const validation = validateMessageFormData({
      content: formState.content,
      image: formState.image || undefined,
    });

    if (!validation.isValid) {
      setValidationErrors(validation.errors);

      // Show first error as toast
      const firstError = validation.errors.general ||
                        validation.errors.content ||
                        validation.errors.image;
      if (firstError) {
        showToast({
          type: 'error',
          message: firstError,
        });
      }
      return false;
    }

    setValidationErrors({});
    return true;
  }, [formState, showToast]);

  // Handle content change
  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      setFormState(prev => ({ ...prev, content: value }));
    }
  }, [maxLength]);

  // Process image file
  const processImageFile = useCallback((file: File) => {
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      showToast({
        type: 'error',
        message: validation.error || 'Invalid image file',
      });
      return false;
    }

    setFormState(prev => ({ ...prev, image: file }));

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setImagePreview(result);
      }
    };
    reader.onerror = () => {
      showToast({
        type: 'error',
        message: 'Failed to read image file',
      });
      setFormState(prev => ({ ...prev, image: null }));
    };
    reader.readAsDataURL(file);
    return true;
  }, [showToast]);

  // Handle image selection
  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  }, [processImageFile]);

  // Reset form state completely
  const resetFormState = useCallback(() => {
    setFormState({ content: '', image: null });
    setImagePreview(null);
    setValidationErrors({});
    setIsComposing(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, []);

  // Remove image
  const handleRemoveImage = useCallback(() => {
    setFormState(prev => ({ ...prev, image: null }));
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled || isSubmitting) return;

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      // Only set dragActive to false if we're leaving the container
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect && (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      )) {
        setDragActive(false);
      }
    }
  }, [disabled, isSubmitting]);

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled || isSubmitting) return;

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        processImageFile(file);
      } else {
        showToast({
          type: 'error',
          message: 'Please drop an image file',
        });
      }
    }
  }, [disabled, isSubmitting, processImageFile, showToast]);

  // Handle form submission
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (isSubmitting || disabled || !validateForm()) {
      return;
    }

    // Store message data before resetting state
    const messageData: MessageFormData = {
      content: formState.content.trim(),
      image: formState.image || undefined,
    };

    try {
      setIsSubmitting(true);

      // Reset form state immediately for better UX
      resetFormState();

      await onSendMessage(messageData);

      // Focus textarea after successful send
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);

      showToast({
        type: 'success',
        message: 'Message sent successfully',
        duration: 2000,
      });
    } catch (error) {
      // If sending failed, restore the form state
      setFormState({
        content: messageData.content,
        image: messageData.image || null,
      });

      // Restore image preview if there was one
      if (messageData.image) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          if (result) {
            setImagePreview(result);
          }
        };
        reader.readAsDataURL(messageData.image);
      }

      showToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to send message',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, disabled, validateForm, formState, onSendMessage, showToast, resetFormState]);

  // Handle keyboard events
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape' && hasImage) {
      e.preventDefault();
      handleRemoveImage();
    }
  }, [isComposing, handleSubmit, hasImage, handleRemoveImage]);

  // Handle mobile-specific touch events for better UX
  const handleTouchStart = useCallback(() => {
    // Ensure textarea is focused on mobile when touched
    if (textareaRef.current && !disabled && !isSubmitting) {
      textareaRef.current.focus();
    }
  }, [disabled, isSubmitting]);

  // Handle composition events (for IME)
  const handleCompositionStart = useCallback(() => {
    setIsComposing(true);
  }, []);

  const handleCompositionEnd = useCallback(() => {
    setIsComposing(false);
  }, []);

  // Check if form can be submitted
  const canSubmit = useMemo(() => {
    return (hasContent || hasImage) &&
           !hasValidationErrors &&
           !isSubmitting &&
           !disabled &&
           contentLength <= maxLength;
  }, [hasContent, hasImage, hasValidationErrors, isSubmitting, disabled, contentLength, maxLength]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'border-t border-border bg-card transition-colors relative',
        // Responsive padding: smaller on mobile, larger on desktop
        'p-3 sm:p-4',
        // Mobile-specific optimizations
        'safe-area-inset-bottom', // Handle iPhone notch/home indicator
        'mobile-scroll-fix', // Smooth scrolling on mobile
        dragActive && 'bg-primary/10 border-primary'
      )}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {dragActive && (
        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center z-10 pointer-events-none">
          <div className="bg-card p-3 sm:p-4 rounded-lg shadow-lg border-2 border-dashed border-primary">
            <FileImage className="w-6 h-6 sm:w-8 sm:h-8 text-primary mx-auto mb-2" />
            <p className="text-xs sm:text-sm text-primary font-medium">Drop image here</p>
          </div>
        </div>
      )}

      {/* Image preview */}
      {imagePreview && (
        <div className="mb-2 sm:mb-3">
          <div className="relative inline-block">
            <NextImage
              src={imagePreview}
              alt="Preview"
              width={128}
              height={128}
              className={cn(
                // Responsive image size: smaller on mobile
                'w-20 h-20 sm:max-w-32 sm:max-h-32 rounded-lg border-2 transition-colors object-cover',
                validationErrors.image ? 'border-destructive' : 'border-border'
              )}
            />
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-5 h-5 sm:w-6 sm:h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/90 transition-colors focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2"
              title="Remove image"
            >
              <X className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            </button>
          </div>
          {formState.image && (
            <div className="mt-1 sm:mt-2">
              <p className="text-xs text-muted-foreground truncate max-w-[200px] sm:max-w-none">
                {formState.image.name} ({formatFileSize(formState.image.size)})
              </p>
              {validationErrors.image && (
                <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3" />
                  {validationErrors.image}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-3">
        <div className="flex items-end gap-1.5 sm:gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={formState.content}
              onChange={handleContentChange}
              onKeyDown={handleKeyDown}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              onTouchStart={handleTouchStart}
              placeholder={placeholder}
              disabled={disabled || isSubmitting}
              rows={1}
              maxLength={maxLength}
              className={cn(
                // Responsive padding and spacing
                'w-full px-3 py-2 pr-16 sm:pr-20 border rounded-lg resize-none transition-all duration-200',
                // Mobile-specific font size to prevent zoom on iOS
                'text-base sm:text-sm',
                // Mobile scroll optimization
                'mobile-scroll-fix',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
                'placeholder:text-muted-foreground',
                validationErrors.content
                  ? 'border-destructive bg-destructive/10 focus:ring-destructive'
                  : 'border-input bg-background',
                (disabled || isSubmitting) && 'bg-muted cursor-not-allowed opacity-60',
                contentLength > maxLength * 0.9 && 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950'
              )}
              style={{
                minHeight: '40px',
                maxHeight: '120px',
                // Prevent zoom on iOS Safari
                fontSize: '16px'
              }}
              aria-describedby="char-count"
              aria-invalid={!!validationErrors.content}
            />

            {/* Character count */}
            <div
              id="char-count"
              className="absolute bottom-1 right-10 sm:right-12 text-xs text-muted-foreground"
            >
              <span
                className={cn(
                  "max-md:hidden",
                  contentLength > maxLength * 0.9 && 'text-yellow-600 dark:text-yellow-400',
                  contentLength > maxLength && 'text-destructive'
                )}
              >
                {contentLength}/{maxLength}
              </span>
            </div>

            {/* Image button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isSubmitting}
              className={cn(
                // Responsive positioning and sizing
                'absolute right-1.5 sm:right-2 top-1/2 transform -translate-y-1/2 p-1 sm:p-1.5 rounded transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                // Touch-friendly sizing on mobile
                'min-w-[32px] min-h-[32px] sm:min-w-[28px] sm:min-h-[28px]',
                hasImage
                  ? 'text-primary bg-primary/10 hover:bg-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                (disabled || isSubmitting) && 'opacity-50 cursor-not-allowed'
              )}
              title="Attach image (or drag & drop)"
            >
              <Image className="w-4 h-4" aria-label="Attach image" />
            </button>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              onChange={handleImageSelect}
              className="hidden"
            />
          </div>

          {/* Send button */}
          <button
            type="submit"
            disabled={!canSubmit}
            aria-label="Send message"
            className={cn(
              // Responsive sizing and touch-friendly design
              'p-2 sm:p-2.5 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2',
              // Ensure minimum touch target size on mobile
              'min-w-[44px] min-h-[44px] sm:min-w-[40px] sm:min-h-[40px]',
              'flex items-center justify-center',
              canSubmit
                ? 'bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-ring shadow-sm hover:shadow-md'
                : 'bg-muted text-muted-foreground cursor-not-allowed',
              isSubmitting && 'scale-95'
            )}
            title={canSubmit ? 'Send message (Enter)' : 'Enter a message to send'}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
            ) : (
              <Send className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </button>
        </div>

        {/* Validation errors */}
        {validationErrors.general && (
          <p className="text-xs sm:text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />
            {validationErrors.general}
          </p>
        )}
      </form>
    </div>
  );
}