import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithStore } from '@/test-utils/render';
import { useAuthStore } from '@/stores/authStore';
import { LoginForm } from '../LoginForm';

// vi.mock factories are hoisted, so the fixtures must be hoisted with them.
const { COUNTRIES } = vi.hoisted(() => ({
  COUNTRIES: [
    {
      name: { common: 'United States', official: 'United States of America' },
      cca2: 'US',
      cca3: 'USA',
      idd: { root: '+1', suffixes: [''] },
      flag: '🇺🇸',
    },
    {
      name: { common: 'India', official: 'Republic of India' },
      cca2: 'IN',
      cca3: 'IND',
      idd: { root: '+91', suffixes: [''] },
      flag: '🇮🇳',
    },
    {
      name: { common: 'Germany', official: 'Federal Republic of Germany' },
      cca2: 'DE',
      cca3: 'DEU',
      idd: { root: '+49', suffixes: [''] },
      flag: '🇩🇪',
    },
  ],
}));

vi.mock('@/lib/countryService', async () => {
  const actual = await vi.importActual<typeof import('@/lib/countryService')>(
    '@/lib/countryService'
  );
  return {
    ...actual,
    fetchCountries: vi.fn().mockResolvedValue(COUNTRIES),
  };
});

const login = vi.fn().mockResolvedValue(undefined);

beforeEach(async () => {
  vi.clearAllMocks();

  // restoreMocks strips implementations between tests, so the fixture has to be
  // reinstalled explicitly rather than only in the vi.mock factory.
  const { fetchCountries } = await import('@/lib/countryService');
  vi.mocked(fetchCountries).mockResolvedValue(COUNTRIES as never);

  const { useAuthStore: fresh } = await import('@/stores/authStore');
  fresh.setState({
    user: null,
    isLoading: false,
    error: null,
    otpSent: false,
    otpVerified: false,
  });
  useAuthStore.setState({ login });
  login.mockResolvedValue(undefined);
});

afterEach(() => {
  useAuthStore.setState({ login });
});

describe('LoginForm rendering', () => {
  it('shows the welcome copy', async () => {
    renderWithStore(<LoginForm />);

    expect(screen.getByText('Welcome to Gemini Chat')).toBeInTheDocument();
    expect(screen.getByText('Enter your phone number to get started')).toBeInTheDocument();
  });

  it('renders labelled inputs', () => {
    renderWithStore(<LoginForm />);

    expect(screen.getByLabelText('Phone Number')).toBeInTheDocument();
    expect(document.getElementById('countryCode')).toBeInTheDocument();
  });

  it('associates the country label with the selector trigger', () => {
    renderWithStore(<LoginForm />);

    expect(screen.getByLabelText('Country')).toBe(document.getElementById('countryCode'));
  });

  it('renders a tel input for the phone number', () => {
    renderWithStore(<LoginForm />);

    expect(screen.getByLabelText('Phone Number')).toHaveAttribute('type', 'tel');
  });

  it('defaults the country to the United States dial code', async () => {
    renderWithStore(<LoginForm />);

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Country' })).toHaveTextContent('+1');
    });
  });

  it('disables submit until the form is valid', async () => {
    renderWithStore(<LoginForm />);

    expect(screen.getByRole('button', { name: /send otp/i })).toBeDisabled();
  });
});

describe('LoginForm phone number validation', () => {
  it('shows an error for a too short number', async () => {
    const user = userEvent.setup();
    renderWithStore(<LoginForm />);

    await user.type(screen.getByLabelText('Phone Number'), '12345');

    await waitFor(() => {
      expect(
        screen.getByText('Phone number must be at least 6 digits')
      ).toBeInTheDocument();
    });
  });

  it('never lets non-digit characters reach the field', async () => {
    const user = userEvent.setup();
    renderWithStore(<LoginForm />);

    const input = screen.getByLabelText('Phone Number');
    await user.type(input, 'abc123def');

    // The handler strips non-digits, so the schema's "only digits" rule is
    // defence in depth rather than something the UI can trigger.
    await waitFor(() => expect(input).toHaveValue('123'));
  });

  it('enables submit for a valid number', async () => {
    const user = userEvent.setup();
    renderWithStore(<LoginForm />);

    await user.type(screen.getByLabelText('Phone Number'), '5551234567');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /send otp/i })).toBeEnabled();
    });
  });

  it('strips formatting characters as the user types', async () => {
    const user = userEvent.setup();
    renderWithStore(<LoginForm />);

    const input = screen.getByLabelText('Phone Number');
    await user.type(input, '(555) 123-4567');

    await waitFor(() => expect(input).toHaveValue('5551234567'));
  });
});

describe('LoginForm submission', () => {
  it('submits the country code and phone number', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    renderWithStore(<LoginForm onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText('Phone Number'), '5551234567');
    await user.click(screen.getByRole('button', { name: /send otp/i }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith({
        countryCode: '+1',
        phoneNumber: '5551234567',
      });
    });
    expect(onSuccess).toHaveBeenCalled();
  });

  it('confirms with a toast naming the destination number', async () => {
    const user = userEvent.setup();
    const { showToast } = renderWithStore(<LoginForm />);

    await user.type(screen.getByLabelText('Phone Number'), '5551234567');
    await user.click(screen.getByRole('button', { name: /send otp/i }));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith({
        type: 'success',
        message: 'OTP sent to +1 5551234567',
      });
    });
  });

  it('works without an onSuccess callback', async () => {
    const user = userEvent.setup();
    renderWithStore(<LoginForm />);

    await user.type(screen.getByLabelText('Phone Number'), '5551234567');
    await user.click(screen.getByRole('button', { name: /send otp/i }));

    await waitFor(() => expect(login).toHaveBeenCalled());
  });

  it('reports a send failure with an error toast', async () => {
    const user = userEvent.setup();
    login.mockRejectedValueOnce(new Error('network down'));
    const { showToast } = renderWithStore(<LoginForm />);

    await user.type(screen.getByLabelText('Phone Number'), '5551234567');
    await user.click(screen.getByRole('button', { name: /send otp/i }));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith({
        type: 'error',
        message: 'Failed to send OTP. Please try again.',
      });
    });
  });

  it('surfaces the store error message', async () => {
    const { rerender } = renderWithStore(<LoginForm />);
    const { useAuthStore: store } = await import('@/stores/authStore');

    store.setState({ error: 'Too many attempts' });
    rerender(<LoginForm />);

    expect(screen.getByText('Too many attempts')).toBeInTheDocument();
  });

  it('shows a sending label while the request is in flight', async () => {
    const { rerender } = renderWithStore(<LoginForm />);
    const { useAuthStore: store } = await import('@/stores/authStore');

    store.setState({ isLoading: true });
    rerender(<LoginForm />);

    expect(screen.getByRole('button', { name: /sending otp/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sending otp/i })).toBeDisabled();
  });
});

/**
 * The trigger is named by its <label>, not its contents, because role=combobox
 * does not take its accessible name from content. Waiting for the dial code is
 * how we know the country list has loaded. The node is re-queried on each
 * attempt because the loading placeholder is swapped out, not patched.
 */
async function findCountryTrigger(): Promise<HTMLElement> {
  return waitFor(() => {
    const trigger = screen.getByRole('combobox', { name: 'Country' });
    expect(trigger).toHaveTextContent('+1');
    return trigger;
  });
}

describe('LoginForm country selection', () => {
  it('shows a loading placeholder before the countries arrive', () => {
    renderWithStore(<LoginForm />);

    expect(screen.getByRole('status', { name: 'Country' })).toHaveTextContent(
      'Loading countries...'
    );
  });

  it('announces the list state on the trigger', async () => {
    renderWithStore(<LoginForm />);

    const trigger = await findCountryTrigger();

    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens the option list on click', async () => {
    const user = userEvent.setup();
    renderWithStore(<LoginForm />);

    const trigger = await findCountryTrigger();
    await user.click(trigger);

    await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'true'));
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  it('submits the chosen dial code', async () => {
    const user = userEvent.setup();
    renderWithStore(<LoginForm />);

    await user.click(await findCountryTrigger());
    await user.click(await screen.findByRole('option', { name: /India/ }));

    await user.type(screen.getByLabelText('Phone Number'), '9876543210');
    await user.click(screen.getByRole('button', { name: /send otp/i }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith({
        countryCode: '+91',
        phoneNumber: '9876543210',
      });
    });
  });

  it('shows the selected country in the trigger', async () => {
    const user = userEvent.setup();
    renderWithStore(<LoginForm />);

    const trigger = await findCountryTrigger();
    await user.click(trigger);
    await user.click(await screen.findByRole('option', { name: /Germany/ }));

    await waitFor(() => expect(trigger).toHaveTextContent('+49'));
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });
});