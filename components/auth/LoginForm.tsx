'use client';


import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Phone, Loader2 } from 'lucide-react';
import { loginSchema, LoginFormData } from '@/lib/validations';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { CountrySelector } from './CountrySelector';
import { cn } from '@/lib/utils';

interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const { login, isLoading, error } = useAuthStore();
  const { showToast } = useUIStore();
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: {
      countryCode: '',
      phoneNumber: '',
    },
  });

  const countryCode = watch('countryCode');

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data);
      showToast({
        type: 'success',
        message: `OTP sent to ${data.countryCode} ${data.phoneNumber}`,
      });
      onSuccess?.();
    } catch (error) {
      showToast({
        type: 'error',
        message: 'Failed to send OTP. Please try again.',
      });
    }
  };

  const handleCountryChange = (newCountryCode: string) => {
    setValue('countryCode', newCountryCode, { shouldValidate: true });
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits
    const value = e.target.value.replace(/\D/g, '');
    setValue('phoneNumber', value, { shouldValidate: true });
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Phone className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Welcome to Gemini Chat
        </h1>
        <p className="text-muted-foreground">
          Enter your phone number to get started
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Country Code Selector */}
        <div>
          <label htmlFor="countryCode" className="block text-sm font-medium text-foreground mb-2">
            Country
          </label>
          <CountrySelector
            value={countryCode}
            onChange={handleCountryChange}
            error={errors.countryCode?.message}
            disabled={isLoading}
          />
        </div>

        {/* Phone Number Input */}
        <div>
          <label htmlFor="phoneNumber" className="block text-sm font-medium text-foreground mb-2">
            Phone Number
          </label>
          <div className="relative">
            <input
              {...register('phoneNumber')}
              type="tel"
              placeholder="Enter your phone number"
              onChange={handlePhoneNumberChange}
              disabled={isLoading}
              className={cn(
                "w-full px-3 py-2 border rounded-md text-sm transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
                "placeholder:text-muted-foreground",
                errors.phoneNumber
                  ? "border-destructive bg-destructive/10 text-destructive"
                  : "border-input bg-background text-foreground",
                isLoading && "bg-muted cursor-not-allowed"
              )}
            />
          </div>
          {errors.phoneNumber && (
            <p className="mt-1 text-xs text-destructive">{errors.phoneNumber.message}</p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">{error}</p>
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
              Sending OTP...
            </>
          ) : (
            'Send OTP'
          )}
        </button>
      </form>

      {/* Info Text */}
      <div className="mt-6 text-center">
        <p className="text-xs text-muted-foreground">
          By continuing, you agree to our Terms of Service and Privacy Policy.
          We&apos;ll send you a 6-digit verification code via SMS.
        </p>
      </div>
    </div>
  );
}
