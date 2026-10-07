import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUIStore } from '@/stores/uiStore';

const INITIAL_STATE = {
  theme: 'light' as const,
  sidebarOpen: true,
  toasts: [],
};

function resetStore() {
  useUIStore.setState({ ...INITIAL_STATE });
}

describe('useUIStore theme', () => {
  beforeEach(resetStore);

  it('defaults to the light theme with the sidebar open', () => {
    expect(useUIStore.getState().theme).toBe('light');
    expect(useUIStore.getState().sidebarOpen).toBe(true);
  });

  it('toggles from light to dark', () => {
    useUIStore.getState().toggleTheme();
    expect(useUIStore.getState().theme).toBe('dark');
  });

  it('toggles back from dark to light', () => {
    useUIStore.getState().toggleTheme();
    useUIStore.getState().toggleTheme();
    expect(useUIStore.getState().theme).toBe('light');
  });

  it('sets the theme explicitly without toggling', () => {
    useUIStore.getState().setTheme('dark');
    useUIStore.getState().setTheme('dark');
    expect(useUIStore.getState().theme).toBe('dark');
  });
});

describe('useUIStore sidebar', () => {
  beforeEach(resetStore);

  it('toggles the sidebar closed and back open', () => {
    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarOpen).toBe(false);

    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarOpen).toBe(true);
  });

  it('sets the sidebar state explicitly', () => {
    useUIStore.getState().setSidebarOpen(false);
    expect(useUIStore.getState().sidebarOpen).toBe(false);
  });
});

describe('useUIStore toasts', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetStore();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with no toasts', () => {
    expect(useUIStore.getState().toasts).toEqual([]);
  });

  it('appends a toast with a generated id and a default duration', () => {
    useUIStore.getState().showToast({ type: 'success', message: 'Saved' });

    const { toasts } = useUIStore.getState();
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toBe('Saved');
    expect(toasts[0].type).toBe('success');
    expect(toasts[0].id).toMatch(/^toast_/);
    expect(toasts[0].duration).toBe(5000);
  });

  it('respects an explicit duration', () => {
    useUIStore.getState().showToast({ type: 'info', message: 'Quick', duration: 2000 });
    expect(useUIStore.getState().toasts[0].duration).toBe(2000);
  });

  it('auto-removes the toast once its duration elapses', () => {
    useUIStore.getState().showToast({ type: 'info', message: 'Quick', duration: 2000 });
    expect(useUIStore.getState().toasts).toHaveLength(1);

    vi.advanceTimersByTime(2000);

    expect(useUIStore.getState().toasts).toHaveLength(0);
  });

  it('falls back to the default duration when given zero', () => {
    // `toast.duration || 5000` means an explicit 0 cannot request a sticky toast.
    useUIStore.getState().showToast({ type: 'warning', message: 'Sticky', duration: 0 });

    expect(useUIStore.getState().toasts[0].duration).toBe(5000);

    vi.advanceTimersByTime(5000);

    expect(useUIStore.getState().toasts).toHaveLength(0);
  });

  it('stacks multiple toasts', () => {
    useUIStore.getState().showToast({ type: 'success', message: 'first' });
    useUIStore.getState().showToast({ type: 'error', message: 'second' });

    const { toasts } = useUIStore.getState();
    expect(toasts.map(t => t.message)).toEqual(['first', 'second']);
  });

  it('generates a unique id per toast even within the same millisecond', () => {
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    for (let i = 0; i < 25; i++) {
      useUIStore.getState().showToast({ type: 'info', message: `toast ${i}` });
    }

    const ids = useUIStore.getState().toasts.map(t => t.id);
    expect(new Set(ids).size).toBe(25);
  });

  it('removes only the targeted toast', () => {
    useUIStore.getState().showToast({ type: 'info', message: 'keep', duration: 0 });
    useUIStore.getState().showToast({ type: 'info', message: 'drop', duration: 0 });

    const target = useUIStore.getState().toasts.find(t => t.message === 'drop')!;
    useUIStore.getState().removeToast(target.id);

    expect(useUIStore.getState().toasts.map(t => t.message)).toEqual(['keep']);
  });

  it('ignores removal of an unknown id', () => {
    useUIStore.getState().showToast({ type: 'info', message: 'keep', duration: 0 });

    useUIStore.getState().removeToast('toast_does_not_exist');

    expect(useUIStore.getState().toasts).toHaveLength(1);
  });

  it('clears every toast at once', () => {
    useUIStore.getState().showToast({ type: 'info', message: 'a', duration: 0 });
    useUIStore.getState().showToast({ type: 'info', message: 'b', duration: 0 });

    useUIStore.getState().clearAllToasts();

    expect(useUIStore.getState().toasts).toEqual([]);
  });

  it('preserves toast methods when clearing', () => {
    useUIStore.getState().clearAllToasts();
    expect(typeof useUIStore.getState().showToast).toBe('function');
  });
});

describe('useUIStore persistence', () => {
  beforeEach(() => {
    resetStore();
    window.localStorage.clear();
  });

  it('persists the theme and sidebar under the ui-storage key', () => {
    useUIStore.getState().setTheme('dark');
    useUIStore.getState().setSidebarOpen(false);

    const raw = window.localStorage.getItem('ui-storage');
    expect(raw).toBeTruthy();

    const persisted = JSON.parse(raw!);
    expect(persisted.state.theme).toBe('dark');
    expect(persisted.state.sidebarOpen).toBe(false);
  });

  it('does not persist toasts', () => {
    useUIStore.getState().showToast({ type: 'info', message: 'transient' });

    const raw = window.localStorage.getItem('ui-storage');
    const persisted = raw ? JSON.parse(raw) : { state: {} };
    expect(persisted.state.toasts).toBeUndefined();
  });
});