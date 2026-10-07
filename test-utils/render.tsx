import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { onTestFinished, vi } from 'vitest';
import { useUIStore } from '@/stores/uiStore';
import type { ReactElement } from 'react';

/**
 * Renders a component with the real Zustand stores in place and returns a spy
 * standing in for `showToast`, so tests can assert on user feedback without
 * mocking the store module (which would hide real integration bugs).
 *
 * The spy is restored when the test finishes; without that it would leak into
 * later tests and silently swallow their toasts.
 */
export function renderWithStore(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
): RenderResult & { showToast: ReturnType<typeof vi.fn> } {
  const showToast = vi.fn();
  const previous = useUIStore.getState().showToast;
  useUIStore.setState({ showToast });

  onTestFinished(() => {
    useUIStore.setState({ showToast: previous });
  });

  const result = render(ui, options);

  return Object.assign(result, { showToast });
}