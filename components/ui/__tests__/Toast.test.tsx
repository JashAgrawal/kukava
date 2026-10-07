import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithStore } from '@/test-utils/render';
import { useUIStore } from '@/stores/uiStore';
import { Toast, ToastContainer } from '../Toast';
import type { Toast as ToastType } from '@/types';

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt="" {...props} />;
  },
}));

function makeToast(overrides: Partial<ToastType> = {}): ToastType {
  return {
    id: 'toast_1',
    message: 'Something happened',
    type: 'info',
    ...overrides,
  };
}

describe('Toast', () => {
  beforeEach(() => {
    useUIStore.setState({ toasts: [] });
  });

  it('renders the message', () => {
    renderWithStore(<Toast toast={makeToast({ message: 'Saved your changes' })} />);

    expect(screen.getByText('Saved your changes')).toBeInTheDocument();
  });

  it.each([
    ['success', 'bg-green-50'],
    ['error', 'bg-red-50'],
    ['warning', 'bg-yellow-50'],
    ['info', 'bg-blue-50'],
  ] as const)('applies the %s styling', (type, expectedClass) => {
    renderWithStore(<Toast toast={makeToast({ type })} />);

    expect(screen.getByText('Something happened').closest('div')?.parentElement).toHaveClass(
      expectedClass
    );
  });

  it('defaults unknown styling to info', () => {
    renderWithStore(<Toast toast={makeToast({ type: 'unknown' as ToastType['type'] })} />);

    expect(screen.getByText('Something happened').closest('div')?.parentElement).toHaveClass(
      'bg-blue-50'
    );
  });

  it('removes the toast when the close button is clicked', async () => {
    const user = userEvent.setup();
    const removeToast = vi.fn();
    useUIStore.setState({ removeToast });
    renderWithStore(<Toast toast={makeToast()} />);

    await user.click(screen.getByRole('button'));

    expect(removeToast).toHaveBeenCalledWith('toast_1');
  });

  it('auto-removes the toast after its duration', async () => {
    vi.useFakeTimers();
    const removeToast = vi.fn();
    useUIStore.setState({ removeToast });
    renderWithStore(<Toast toast={makeToast({ duration: 3000 })} />);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(removeToast).toHaveBeenCalledWith('toast_1');
    vi.useRealTimers();
  });

  it('does not auto-remove a toast without a duration', () => {
    vi.useFakeTimers();
    const removeToast = vi.fn();
    useUIStore.setState({ removeToast });
    renderWithStore(<Toast toast={makeToast({ duration: undefined })} />);

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(removeToast).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('clears the pending timer on unmount', () => {
    vi.useFakeTimers();
    const removeToast = vi.fn();
    useUIStore.setState({ removeToast });
    const { unmount } = renderWithStore(<Toast toast={makeToast({ duration: 3000 })} />);

    unmount();
    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(removeToast).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});

describe('ToastContainer', () => {
  beforeEach(() => {
    useUIStore.setState({ toasts: [] });
  });

  it('renders nothing when there are no toasts', () => {
    const { container } = renderWithStore(<ToastContainer />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders every queued toast', () => {
    useUIStore.setState({
      toasts: [
        makeToast({ id: 'a', message: 'First', duration: 0 }),
        makeToast({ id: 'b', message: 'Second', duration: 0 }),
      ],
    });

    renderWithStore(<ToastContainer />);

    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });

  it('renders toasts pushed through the store', async () => {
    // Plain render: renderWithStore swaps showToast for a spy, which would
    // stop the toast from ever entering the queue.
    render(<ToastContainer />);
    expect(screen.queryByText('Live update')).not.toBeInTheDocument();

    await act(async () => {
      useUIStore.getState().showToast({ type: 'success', message: 'Live update' });
    });

    await waitFor(() => {
      expect(screen.getByText('Live update')).toBeInTheDocument();
    });
  });
});