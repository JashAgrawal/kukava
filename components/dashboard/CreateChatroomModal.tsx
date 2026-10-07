'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Loader2, MessageCircle } from 'lucide-react';
import { CreateChatroomFormData } from '@/lib/validations';
import { cn } from '@/lib/utils';
import { captureException } from '@/lib/errorTracking';

interface CreateChatroomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateChatroomFormData) => Promise<void>;
  isLoading?: boolean;
}

export function CreateChatroomModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}: CreateChatroomModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);

  // Validation logic
  const validateTitle = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) {
      return 'Chat title is required';
    }
    if (trimmed.length > 50) {
      return 'Chat title must be at most 50 characters';
    }
    return '';
  };

  // Check if form is valid
  const isFormValid = title.trim().length > 0 && title.trim().length <= 50;

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTitle(value);

    if (touched) {
      setError(validateTitle(value));
    }
  };

  // Handle input blur
  const handleInputBlur = () => {
    setTouched(true);
    setError(validateTitle(title));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateTitle(title);
    if (validationError) {
      setError(validationError);
      setTouched(true);
      return;
    }

    try {
      await onSubmit({ title: title.trim() });
      handleClose();
    } catch (error) {
      captureException(error, 'Chatroom creation failed', { title });
    }
  };

  // Handle modal close
  const handleClose = useCallback(() => {
    setTitle('');
    setError('');
    setTouched(false);
    onClose();
  }, [onClose]);

  // Reset when the parent closes the modal directly, so a draft never survives
  // into the next time it opens.
  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setError('');
      setTouched(false);
    }
  }, [isOpen]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleClose]);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 transition-opacity" />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={modalRef}
          className="relative w-full max-w-md bg-card rounded-lg shadow-xl transform transition-all border border-border"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">
                New Chat
              </h2>
            </div>
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6">
            <div className="mb-6">
              <label htmlFor="title" className="block text-sm font-medium text-foreground mb-2">
                Chat Title
              </label>
              <input
                ref={inputRef}
                id="title"
                name="title"
                type="text"
                value={title}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                placeholder="Enter a title for your chat..."
                disabled={isLoading}
                className={cn(
                  "w-full px-3 py-2 border rounded-md text-sm transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
                  "placeholder:text-muted-foreground",
                  error && touched
                    ? "border-destructive bg-destructive/10 text-destructive"
                    : "border-input bg-background text-foreground",
                  isLoading && "bg-muted cursor-not-allowed"
                )}
              />
              {error && touched && (
                <p className="mt-1 text-xs text-destructive">{error}</p>
              )}
            </div>

            {/* Buttons */}
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="flex-1 px-4 py-2 text-sm font-medium text-muted-foreground bg-muted rounded-md hover:bg-muted/80 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isFormValid || isLoading}
                className={cn(
                  "flex-1 flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                  isFormValid && !isLoading
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Chat'
                )}
              </button>
            </div>
          </form>

          {/* Tips */}
          <div className="px-6 pb-6">
            <div className="bg-primary/10 border border-primary/20 rounded-md p-3">
              <p className="text-xs text-primary">
                💡 <strong>Tip:</strong> Give your chat a descriptive title to easily find it later.
                You can always start chatting with Gemini right away!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
