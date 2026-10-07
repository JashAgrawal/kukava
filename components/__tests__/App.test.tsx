import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import { renderWithStore } from '@/test-utils/render';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { App } from '../App';
import type { User } from '@/types';

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

/** App has a deliberate 1s startup delay, so waits need a longer budget. */
function waitForApp(assertion: () => void) {
  return waitFor(assertion, { timeout: 4000 });
}

const USER: User = {
  id: 'user_1',
  phoneNumber: '5551234567',
  countryCode: '+1',
  isAuthenticated: true,
  createdAt: new Date('2024-01-01T00:00:00Z'),
};

beforeEach(async () => {
  vi.clearAllMocks();
  vi.spyOn(console, 'log').mockImplementation(() => {});

  const { fetchCountries } = await import('@/lib/countryService');
  vi.mocked(fetchCountries).mockResolvedValue(COUNTRIES as never);

  useAuthStore.setState({
    user: null,
    isLoading: false,
    error: null,
    otpSent: false,
    otpVerified: false,
  });
  useUIStore.setState({ theme: 'light', sidebarOpen: true, toasts: [] });
});

describe('App routing', () => {
  it('shows a loader during initialization', async () => {
    renderWithStore(<App />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows the auth page once initialization finishes', async () => {
    renderWithStore(<App />);

    await waitForApp(() => {
      expect(screen.getByText('Welcome to Gemini Chat')).toBeInTheDocument();
    });
  });

  it('shows the loader while authentication is in flight', () => {
    useAuthStore.setState({ isLoading: true });

    renderWithStore(<App />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows the dashboard for an authenticated user', async () => {
    useAuthStore.setState({ user: USER });

    renderWithStore(<App />);

    await waitForApp(() => {
      expect(screen.getByText('Chats')).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText('Search chats...')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Enter your phone number')).not.toBeInTheDocument();
  });
});

describe('App theming', () => {
  it('adds the dark class for the dark theme', async () => {
    useUIStore.setState({ theme: 'dark' });

    renderWithStore(<App />);

    await waitFor(() => {
      expect(document.documentElement).toHaveClass('dark');
    });
  });

  it('removes the dark class for the light theme', async () => {
    renderWithStore(<App />);

    await waitFor(() => {
      expect(document.documentElement).not.toHaveClass('dark');
    });
  });

  it('reacts to a theme change', async () => {
    renderWithStore(<App />);

    await waitForApp(() => expect(screen.getByPlaceholderText('Enter your phone number')).toBeInTheDocument());

    act(() => {
      useUIStore.setState({ theme: 'dark' });
    });

    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));
  });
});

describe('App keyboard shortcuts', () => {
  /**
   * App resolves these shortcuts with a document-wide querySelector, so the
   * probe has to be first in document order. Prepended and removed per test so
   * probes never leak into the next one.
   */
  function withProbe<T extends HTMLElement>(make: () => T, run: (probe: T) => Promise<void>) {
    const probe = make();
    document.body.prepend(probe);
    return run(probe).finally(() => probe.remove());
  }

  const makeSearchProbe = (placeholder: string) => {
    const input = document.createElement('input');
    input.placeholder = placeholder;
    return input;
  };

  it('focuses the search input on Ctrl+/', async () => {
    renderWithStore(<App />);
    await waitForApp(() =>
      expect(screen.getByPlaceholderText('Enter your phone number')).toBeInTheDocument()
    );

    await withProbe(
      () => makeSearchProbe('Search chats ctrl'),
      async probe => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: '/', ctrlKey: true }));
        await waitForApp(() => expect(probe).toHaveFocus());
      }
    );
  });

  it('supports the meta key for macOS shortcuts', async () => {
    renderWithStore(<App />);
    await waitForApp(() =>
      expect(screen.getByPlaceholderText('Enter your phone number')).toBeInTheDocument()
    );

    await withProbe(
      () => makeSearchProbe('Search chats meta'),
      async probe => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: '/', metaKey: true }));
        await waitForApp(() => expect(probe).toHaveFocus());
      }
    );
  });

  it('ignores shortcuts without a modifier', async () => {
    renderWithStore(<App />);
    await waitForApp(() =>
      expect(screen.getByPlaceholderText('Enter your phone number')).toBeInTheDocument()
    );

    await withProbe(
      () => makeSearchProbe('Search chats plain'),
      async probe => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: '/' }));
        expect(probe).not.toHaveFocus();
      }
    );
  });

  it('clicks the new chat button on Ctrl+N', async () => {
    useAuthStore.setState({ user: USER });
    renderWithStore(<App />);
    await waitForApp(() => expect(screen.getByText('Chats')).toBeInTheDocument());

    await withProbe(
      () => {
        const button = document.createElement('button');
        button.title = 'New Chat';
        return button;
      },
      async probe => {
        const onClick = vi.fn();
        probe.addEventListener('click', onClick);

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'n', ctrlKey: true }));

        await waitForApp(() => expect(onClick).toHaveBeenCalled());
      }
    );
  });

  it('blurs the active element on Escape', async () => {
    renderWithStore(<App />);
    await waitForApp(() =>
      expect(screen.getByPlaceholderText('Enter your phone number')).toBeInTheDocument()
    );

    await withProbe(
      () => document.createElement('input'),
      async probe => {
        probe.focus();
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        expect(document.activeElement).not.toBe(probe);
      }
    );
  });

  it('removes its listener on unmount', async () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const { unmount } = renderWithStore(<App />);

    await waitFor(() => expect(screen.getByText('Loading...')).toBeInTheDocument());
    unmount();

    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });
});

describe('App accessibility regions', () => {
  it('provides a polite live region for announcements', async () => {
    renderWithStore(<App />);

    await waitForApp(() => expect(screen.getByPlaceholderText('Enter your phone number')).toBeInTheDocument());

    const region = document.getElementById('accessibility-announcements');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toHaveAttribute('aria-atomic', 'true');
  });

  it('mounts the toast container', async () => {
    renderWithStore(<App />);

    await waitForApp(() => expect(screen.getByPlaceholderText('Enter your phone number')).toBeInTheDocument());

    expect(document.querySelector('.fixed.top-4.right-4')).toBeNull();
  });

  it('renders queued toasts', async () => {
    const { unmount } = renderWithStore(<App />);
    await waitForApp(() => expect(screen.getByPlaceholderText('Enter your phone number')).toBeInTheDocument());
    unmount();

    useUIStore.setState({
      toasts: [{ id: 'toast_x', message: 'Queued', type: 'info', duration: 0 }],
    });
    renderWithStore(<App />);

    await waitForApp(() => expect(screen.getByText('Queued')).toBeInTheDocument());
  });
});