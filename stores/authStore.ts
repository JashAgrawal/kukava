import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthState, User, LoginFormData, OTPFormData } from '@/types';

interface AuthStore extends AuthState {
  login: (data: LoginFormData) => Promise<void>;
  verifyOTP: (data: OTPFormData) => Promise<void>;
  logout: () => void;
  resendOTP: () => Promise<void>;
  resetOTPFlow: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  getCurrentPhoneData: () => LoginFormData | null;
}

// Simulate OTP generation and storage
let currentOTP: string | null = null;
let currentPhoneData: LoginFormData | null = null;

const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const simulateOTPSend = async (phoneData: LoginFormData): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      currentOTP = generateOTP();
      currentPhoneData = phoneData;
      console.log(`🔐 Simulated OTP sent to ${phoneData.countryCode}${phoneData.phoneNumber}: ${currentOTP}`);
      resolve();
    }, 1000);
  });
};

const simulateOTPVerification = async (otp: string): Promise<boolean> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const isValid = otp === currentOTP;
      if (isValid) {
        currentOTP = null; // Clear OTP after successful verification
      }
      resolve(isValid);
    }, 500);
  });
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      error: null,
      otpSent: false,
      otpVerified: false,

      login: async (data: LoginFormData) => {
        try {
          set({ isLoading: true, error: null });
          
          // Simulate API call to send OTP
          await simulateOTPSend(data);
          
          set({ 
            otpSent: true, 
            isLoading: false,
            error: null 
          });
        } catch (error) {
          set({ 
            isLoading: false, 
            error: 'Failed to send OTP. Please try again.' 
          });
        }
      },

      verifyOTP: async (data: OTPFormData) => {
        try {
          set({ isLoading: true, error: null });

          if (!currentPhoneData) {
            throw new Error('No phone data found. Please restart the login process.');
          }

          // Simulate OTP verification
          const isValid = await simulateOTPVerification(data.otp);

          if (!isValid) {
            throw new Error('Invalid OTP. Please try again.');
          }

          // Create user object
          const user: User = {
            id: `user_${Date.now()}`,
            phoneNumber: currentPhoneData.phoneNumber,
            countryCode: currentPhoneData.countryCode,
            isAuthenticated: true,
            createdAt: new Date(),
          };

          set({
            user,
            otpVerified: true,
            otpSent: false, // Reset OTP sent state after successful verification
            isLoading: false,
            error: null
          });

          // Clear temporary data
          currentPhoneData = null;
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'OTP verification failed'
          });
          // Re-throw the error so the component can handle it
          throw error;
        }
      },

      resendOTP: async () => {
        try {
          if (!currentPhoneData) {
            throw new Error('No phone data found. Please restart the login process.');
          }

          set({ isLoading: true, error: null });
          
          // Simulate resending OTP
          await simulateOTPSend(currentPhoneData);
          
          set({ 
            isLoading: false,
            error: null 
          });
        } catch (error) {
          set({ 
            isLoading: false, 
            error: 'Failed to resend OTP. Please try again.' 
          });
        }
      },

      logout: () => {
        set({
          user: null,
          otpSent: false,
          otpVerified: false,
          error: null
        });
        currentOTP = null;
        currentPhoneData = null;
      },

      resetOTPFlow: () => {
        set({
          otpSent: false,
          otpVerified: false,
          error: null
        });
        currentOTP = null;
        currentPhoneData = null;
      },

      getCurrentPhoneData: () => {
        return currentPhoneData;
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user,
        otpVerified: state.otpVerified 
      }),
    }
  )
);
