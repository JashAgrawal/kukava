'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { LoginForm } from './LoginForm';
import { OTPForm } from './OTPForm';

interface AuthPageProps {
  onSuccess?: () => void;
}

export function AuthPage({ onSuccess }: AuthPageProps) {
  const { otpSent, user, clearError, resetOTPFlow, getCurrentPhoneData } = useAuthStore();
  const [phoneData, setPhoneData] = useState<{ countryCode: string; phoneNumber: string } | null>(null);

  // Clear any existing errors when component mounts
  useEffect(() => {
    clearError();
  }, [clearError]);

  // Update phone data when OTP is sent
  useEffect(() => {
    if (otpSent) {
      const currentPhone = getCurrentPhoneData();
      if (currentPhone) {
        setPhoneData(currentPhone);
      }
    }
  }, [otpSent, getCurrentPhoneData]);

  // Redirect if already authenticated
  useEffect(() => {
    if (user?.isAuthenticated) {
      // Add a small delay to allow the success message to be shown
      const timer = setTimeout(() => {
        onSuccess?.();
      }, 1500); // 1.5 second delay

      return () => clearTimeout(timer);
    }
  }, [user, onSuccess]);

  const handleLoginSuccess = () => {
    // Store phone data for OTP form
    // This would normally come from the form state, but we'll get it from the store
    // For now, we'll just proceed to OTP step
  };

  const handleOTPSuccess = () => {
    onSuccess?.();
  };

  const handleBackToLogin = () => {
    // Reset to login form
    setPhoneData(null);
    resetOTPFlow();
  };

  if (user?.isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-border">
          {!otpSent ? (
            <LoginForm onSuccess={handleLoginSuccess} />
          ) : (
            <OTPForm
              phoneNumber={phoneData?.phoneNumber || ""}
              countryCode={phoneData?.countryCode || ""}
              onBack={handleBackToLogin}
              onSuccess={handleOTPSuccess}
            />
          )}
        </div>
      </div>
    </div>
  );
}
