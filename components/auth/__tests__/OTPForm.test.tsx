import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { renderWithStore } from '@/test-utils/render';
import { useAuthStore } from '@/stores/authStore';
import { OTPForm } from '../OTPForm';

const verifyOTP = vi.fn().mockResolvedValue(undefined);
const resendOTP = vi.fn().mockResolvedValue(undefined);

const BASE_STATE = {
  user: null,
  isLoading: false,
  error: null,
  otpSent: true,
  otpVerified: false,
};

function renderOTP(props: Partial<React.ComponentProps<typeof OTPForm>> = {}) {
  return renderWithStore(
    <OTPForm phoneNumber="5551234567" countryCode="+1" {...props} />
  );
}

/** Types a code across the six separate OTP inputs. */
async function typeOTP(user: ReturnType<typeof userEvent.setup>, code: string) {
  for (const [index, digit] of [...code].entries()) {
    const input = screen.getAllByRole('textbox')[index];
    await user.click(input);
    await user.keyboard(digit);
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({
    ...BASE_STATE,
    verifyOTP,
    resendOTP,
  });
  verifyOTP.mockResolvedValue(undefined);
  resendOTP.mockResolvedValue(undefined);
});

describe('OTPForm rendering', () => {
  it('shows the destination number', () => {
    renderOTP();

    expect(screen.getByText('Verify Your Phone')).toBeInTheDocument();
    expect(screen.getByText('+1 5551234567')).toBeInTheDocument();
  });

  it('renders six separate code inputs', () => {
    renderOTP();

    expect(screen.getAllByRole('textbox')).toHaveLength(6);
  });

  it('uses numeric input mode with a one character limit', () => {
    renderOTP();

    for (const input of screen.getAllByRole('textbox')) {
      expect(input).toHaveAttribute('inputmode', 'numeric');
      expect(input).toHaveAttribute('maxlength', '1');
    }
  });

  it('disables submit until the code is complete', () => {
    renderOTP();

    expect(screen.getByRole('button', { name: /verify code/i })).toBeDisabled();
  });

  it('enables submit once six digits are entered', async () => {
    const user = userEvent.setup();
    renderOTP();

    await typeOTP(user, '123456');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /verify code/i })).toBeEnabled();
    });
  });

  it('focuses the first input on mount', () => {
    renderOTP();

    expect(screen.getAllByRole('textbox')[0]).toHaveFocus();
  });

  it('shows the store error message', () => {
    useAuthStore.setState({ error: 'Invalid OTP. Please try again.' });
    renderOTP();

    expect(screen.getByText('Invalid OTP. Please try again.')).toBeInTheDocument();
  });

  it('shows a verifying label while in flight', () => {
    useAuthStore.setState({ isLoading: true });
    renderOTP();

    expect(screen.getByRole('button', { name: /verifying/i })).toBeDisabled();
  });
});

describe('OTPForm input handling', () => {
  it('advances focus as digits are typed', async () => {
    const user = userEvent.setup();
    renderOTP();

    const inputs = screen.getAllByRole('textbox');
    await user.click(inputs[0]);
    await user.keyboard('1');

    await waitFor(() => expect(inputs[1]).toHaveFocus());
  });

  it('ignores non-digit characters', async () => {
    const user = userEvent.setup();
    renderOTP();

    await typeOTP(user, 'a1b2c3');

    const values = screen.getAllByRole('textbox').map(input => (input as HTMLInputElement).value);
    expect(values).toEqual(['1', '2', '3', '', '', '']);
  });

  it('routes each typed digit to its own box', async () => {
    const user = userEvent.setup();
    renderOTP();

    const inputs = screen.getAllByRole('textbox');
    await user.click(inputs[0]);
    await user.keyboard('12');

    // maxLength=1 plus the automatic focus advance means one digit per box.
    expect(inputs[0]).toHaveValue('1');
    expect(inputs[1]).toHaveValue('2');
  });

  it('steps back on Backspace in an empty box', async () => {
    const user = userEvent.setup();
    renderOTP();

    const inputs = screen.getAllByRole('textbox');
    await user.click(inputs[0]);
    await user.keyboard('1');
    await waitFor(() => expect(inputs[1]).toHaveFocus());

    await user.keyboard('{Backspace}');
    await user.keyboard('{Backspace}');

    await waitFor(() => expect(inputs[0]).toHaveFocus());
  });

  it('moves focus with the arrow keys', async () => {
    const user = userEvent.setup();
    renderOTP();

    const inputs = screen.getAllByRole('textbox');
    await user.click(inputs[1]);

    await user.keyboard('{ArrowRight}');
    await waitFor(() => expect(inputs[2]).toHaveFocus());

    await user.keyboard('{ArrowLeft}');
    await waitFor(() => expect(inputs[1]).toHaveFocus());
  });

  it('accepts a pasted six digit code', async () => {
    const user = userEvent.setup();
    renderOTP();

    await user.click(screen.getAllByRole('textbox')[0]);
    await user.paste('987654');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /verify code/i })).toBeEnabled();
    });
  });

  it('trims non-digits out of a paste', async () => {
    const user = userEvent.setup();
    renderOTP();

    await user.click(screen.getAllByRole('textbox')[0]);
    await user.paste('12-34 56-78');

    await waitFor(() => {
      const values = screen
        .getAllByRole('textbox')
        .map(input => (input as HTMLInputElement).value);
      expect(values.slice(0, 6).join('')).toBe('123456');
    });
  });
});

describe('OTPForm submission', () => {
  it('verifies the entered code', async () => {
    const user = userEvent.setup();
    renderOTP();

    await typeOTP(user, '123456');
    await user.click(screen.getByRole('button', { name: /verify code/i }));

    await waitFor(() => {
      expect(verifyOTP).toHaveBeenCalledWith({ otp: '123456' });
    });
  });

  it('confirms with a success toast and calls onSuccess', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const { showToast } = renderOTP({ onSuccess });

    await typeOTP(user, '123456');
    await user.click(screen.getByRole('button', { name: /verify code/i }));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith({
        type: 'success',
        message: 'Phone number verified successfully!',
      });
    });
    expect(onSuccess).toHaveBeenCalled();
  });

  it('reports an invalid code and clears the inputs', async () => {
    const user = userEvent.setup();
    verifyOTP.mockRejectedValueOnce(new Error('Invalid OTP. Please try again.'));
    const { showToast } = renderOTP();

    await typeOTP(user, '123456');
    await user.click(screen.getByRole('button', { name: /verify code/i }));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith({
        type: 'error',
        message: 'Invalid OTP. Please try again.',
      });
    });
    await waitFor(() => {
      expect(screen.getAllByRole('textbox').map(i => (i as HTMLInputElement).value)).toEqual([
        '',
        '',
        '',
        '',
        '',
        '',
      ]);
    });
  });

  it('refocuses the first input after a failed attempt', async () => {
    const user = userEvent.setup();
    verifyOTP.mockRejectedValueOnce(new Error('nope'));
    renderOTP();

    await typeOTP(user, '123456');
    await user.click(screen.getByRole('button', { name: /verify code/i }));

    await waitFor(() => {
      expect(screen.getAllByRole('textbox')[0]).toHaveFocus();
    });
  });
});

describe('OTPForm resend', () => {
  it('starts with a 30 second cooldown', () => {
    renderOTP();

    expect(screen.getByText('Resend in 30s')).toBeInTheDocument();
  });

  it('counts the cooldown down every second', () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderOTP();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText('Resend in 27s')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('disables the resend button during the cooldown', () => {
    renderOTP();

    expect(screen.getByRole('button', { name: /resend in/i })).toBeDisabled();
  });

  it('becomes available once the cooldown elapses', () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderOTP();

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    const button = screen.getByRole('button', { name: /resend code/i });
    expect(button).toBeEnabled();
    vi.useRealTimers();
  });

  it('resends and confirms with a toast', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { showToast } = renderOTP();

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    await user.click(screen.getByRole('button', { name: /resend code/i }));

    await waitFor(() => expect(resendOTP).toHaveBeenCalled());
    expect(showToast).toHaveBeenCalledWith({
      type: 'success',
      message: 'OTP resent successfully!',
    });
    expect(screen.getByText('Resend in 30s')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('reports a resend failure', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    resendOTP.mockRejectedValueOnce(new Error('rate limited'));
    const { showToast } = renderOTP();

    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    await user.click(screen.getByRole('button', { name: /resend code/i }));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith({
        type: 'error',
        message: 'Failed to resend OTP. Please try again.',
      });
    });
    vi.useRealTimers();
  });
});

describe('OTPForm back navigation', () => {
  it('renders a back button when onBack is provided', () => {
    renderOTP({ onBack: vi.fn() });

    expect(screen.getByRole('button', { name: /change phone number/i })).toBeInTheDocument();
  });

  it('omits the back button when onBack is absent', () => {
    renderOTP();

    expect(screen.queryByRole('button', { name: /change phone number/i })).not.toBeInTheDocument();
  });

  it('calls onBack when clicked', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderOTP({ onBack });

    await user.click(screen.getByRole('button', { name: /change phone number/i }));

    expect(onBack).toHaveBeenCalled();
  });
});