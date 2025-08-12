'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Shield, Loader2, ArrowLeft, RotateCcw } from 'lucide-react';
import { otpSchema, OTPFormData } from '@/lib/validations';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/lib/utils';

interface OTPFormProps {
  phoneNumber: string;
  countryCode: string;
  onBack?: () => void;
  onSuccess?: () => void;
}

export function OTPForm({ phoneNumber, countryCode, onBack, onSuccess }: OTPFormProps) {
  const { verifyOTP, resendOTP, isLoading, error } = useAuthStore();
  const { showToast } = useUIStore();
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<OTPFormData>({
    resolver: zodResolver(otpSchema),
    mode: 'onChange',
    defaultValues: {
      otp: '',
    },
  });

  const otpValue = watch('otp');

  // Start resend cooldown
  useEffect(() => {
    setResendCooldown(30); // 30 seconds cooldown
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Focus first input on mount
  useEffect(() => {
    if (otpInputRefs.current[0]) {
      otpInputRefs.current[0].focus();
    }
  }, []);

  const onSubmit = async (data: OTPFormData) => {
    try {
      await verifyOTP(data);

      // Only show success message and call onSuccess if verification actually succeeds
      showToast({
        type: 'success',
        message: 'Phone number verified successfully!',
      });
      onSuccess?.();
    } catch (error) {
      // Show error message for invalid OTP
      showToast({
        type: 'error',
        message: 'Invalid OTP. Please try again.',
      });
      // Clear the OTP input field
      setValue('otp', '');
      // Focus back to first input
      if (otpInputRefs.current[0]) {
        otpInputRefs.current[0].focus();
      }
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    
    try {
      await resendOTP();
      setResendCooldown(30);
      showToast({
        type: 'success',
        message: 'OTP resent successfully!',
      });
    } catch (error) {
      showToast({
        type: 'error',
        message: 'Failed to resend OTP. Please try again.',
      });
    }
  };

  const handleOTPChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);
    
    // Update the current input
    const newOTP = otpValue.split('');
    newOTP[index] = digit;
    const updatedOTP = newOTP.join('');
    
    setValue('otp', updatedOTP, { shouldValidate: true });

    // Move to next input if digit entered
    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Move to previous input on backspace
    if (e.key === 'Backspace' && !otpValue[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
    
    // Move to next input on arrow right
    if (e.key === 'ArrowRight' && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
    
    // Move to previous input on arrow left
    if (e.key === 'ArrowLeft' && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    setValue('otp', pastedData, { shouldValidate: true });
    
    // Focus the last filled input or the first empty one
    const focusIndex = Math.min(pastedData.length, 5);
    otpInputRefs.current[focusIndex]?.focus();
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Shield className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Verify Your Phone
        </h1>
        <p className="text-muted-foreground mb-2">
          We&apos;ve sent a 6-digit code to
        </p>
        <p className="text-foreground font-medium">
          {countryCode} {phoneNumber}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* OTP Input */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-3 text-center">
            Enter verification code
          </label>
          <div className="flex justify-center space-x-2 mb-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <input
                key={index}
                ref={(el) => { otpInputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={otpValue[index] || ''}
                onChange={(e) => handleOTPChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                disabled={isLoading}
                className={cn(
                  "w-12 h-12 text-center text-lg font-semibold border rounded-md transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
                  errors.otp
                    ? "border-destructive bg-destructive/10 text-destructive"
                    : "border-input bg-background text-foreground",
                  isLoading && "bg-muted cursor-not-allowed"
                )}
              />
            ))}
          </div>
          {errors.otp && (
            <p className="text-xs text-destructive text-center">{errors.otp.message}</p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive text-center">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!isValid || isLoading}
          className={cn(
            "w-full flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            isValid && !isLoading
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            'Verify Code'
          )}
        </button>

        {/* Resend OTP */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Didn&apos;t receive the code?
          </p>
          <button
            type="button"
            onClick={handleResendOTP}
            disabled={resendCooldown > 0 || isLoading}
            className={cn(
              "inline-flex items-center text-sm font-medium transition-colors",
              "focus:outline-none focus:underline",
              resendCooldown > 0 || isLoading
                ? "text-muted-foreground cursor-not-allowed"
                : "text-primary hover:text-primary/80"
            )}
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
          </button>
        </div>

        {/* Back Button */}
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            disabled={isLoading}
            className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-muted-foreground bg-muted rounded-md hover:bg-muted/80 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Change Phone Number
          </button>
        )}
      </form>
    </div>
  );
}
