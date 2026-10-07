import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithStore } from '@/test-utils/render';
import { useAuthStore } from '@/stores/authStore';
import { AuthPage } from '../AuthPage';
import type { LoginFormData, User } from '@/types';

const { COUNTRIES } = vi.hoisted(() => ({
  COUNTRIES: [
    {
      name: { common: 'United States', official: 'United States of America' },
      cca2: 'US',
      cca3: 'USA',
      idd: { root: '+1', suffixes: [''] },
      flag: '🇺🇸',
    },
  ],
}));

vi.mock('@/lib/countryService', async () => {
  const actual = await vi.importActual<typeof import('@/lib/countryService')>(
    '@/lib/countryService'
  );
  return { ...actual, fetchCountries: vi.fn().mockResolvedValue(COUNTRIES) };
});

const PHONE: LoginFormData = { countryCode: '+1', phoneNumber: '5551234567' };

function authenticatedUser(): User {
  return {
    id: 'user_1',
    phoneNumber: PHONE.phoneNumber,
    countryCode: PHONE.countryCode,
    isAuthenticated: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
  };
}

beforeEach(async () => {
  vi.clearAllMocks();

  // restoreMocks strips the factory implementation, so reinstall the fixture.
  const { fetchCountries } = await import('@/lib/countryService');
  vi.mocked(fetchCountries).mockResolvedValue(COUNTRIES as never);

  useAuthStore.setState({
    user: null,
    isLoading: false,
    error: null,
    otpSent: false,
    otpVerified: false,
    getCurrentPhoneData: () => null,
  });
});

describe('AuthPage initial state', () => {
  it('shows the login step first', () => {
    renderWithStore(<AuthPage />);

    expect(screen.getByText('Welcome to Gemini Chat')).toBeInTheDocument();
  });

  it('clears any stale error on mount', async () => {
    const clearError = vi.fn();
    useAuthStore.setState({ error: 'stale', clearError });

    renderWithStore(<AuthPage />);

    await waitFor(() => expect(clearError).toHaveBeenCalled());
  });
});

describe('AuthPage OTP step', () => {
  it('switches to the OTP form once an OTP is sent', () => {
    useAuthStore.setState({ otpSent: true, getCurrentPhoneData: () => PHONE });

    renderWithStore(<AuthPage />);

    expect(screen.getByText('Verify Your Phone')).toBeInTheDocument();
    expect(screen.getByText('+1 5551234567')).toBeInTheDocument();
  });

  it('shows the OTP form with a blank number when the phone data is missing', () => {
    useAuthStore.setState({ otpSent: true, getCurrentPhoneData: () => null });

    renderWithStore(<AuthPage />);

    expect(screen.getByText('Verify Your Phone')).toBeInTheDocument();
  });

  it('returns to the login step when going back', async () => {
    const user = userEvent.setup();
    const resetOTPFlow = vi.fn();
    useAuthStore.setState({
      otpSent: true,
      getCurrentPhoneData: () => PHONE,
      resetOTPFlow,
    });

    renderWithStore(<AuthPage />);
    await user.click(screen.getByRole('button', { name: /change phone number/i }));

    expect(resetOTPFlow).toHaveBeenCalled();
  });
});

describe('AuthPage after authentication', () => {
  it('renders nothing once the user is authenticated', () => {
    useAuthStore.setState({ user: authenticatedUser() });

    const { container } = renderWithStore(<AuthPage />);

    expect(container).toBeEmptyDOMElement();
  });

  it('calls onSuccess after the redirect delay', async () => {
    const onSuccess = vi.fn();
    useAuthStore.setState({ user: authenticatedUser() });

    renderWithStore(<AuthPage onSuccess={onSuccess} />);

    expect(onSuccess).not.toHaveBeenCalled();
    await waitFor(() => expect(onSuccess).toHaveBeenCalled(), { timeout: 3000 });
  });

  it('does not throw when no callback is provided', async () => {
    useAuthStore.setState({ user: authenticatedUser() });

    const { container } = renderWithStore(<AuthPage />);

    await new Promise(resolve => setTimeout(resolve, 50));
    expect(container).toBeEmptyDOMElement();
  });
});

describe('AuthPage sign-in flow', () => {
  it('advances from OTP to the authenticated redirect', async () => {
    const onSuccess = vi.fn();
    useAuthStore.setState({ otpSent: true, getCurrentPhoneData: () => PHONE });

    renderWithStore(<AuthPage onSuccess={onSuccess} />);
    expect(screen.getByText('Verify Your Phone')).toBeInTheDocument();

    useAuthStore.setState({ user: authenticatedUser() });

    await waitFor(() => expect(onSuccess).toHaveBeenCalled(), { timeout: 3000 });
    expect(screen.queryByText('Verify Your Phone')).not.toBeInTheDocument();
  });

  it('keeps the login step visible while signed out', () => {
    useAuthStore.setState({ otpSent: false });

    renderWithStore(<AuthPage />);

    expect(screen.getByText('Welcome to Gemini Chat')).toBeInTheDocument();
    expect(screen.queryByText('Verify Your Phone')).not.toBeInTheDocument();
  });
});