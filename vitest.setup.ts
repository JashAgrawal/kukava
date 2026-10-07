import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom does not implement matchMedia, which the theme-aware components query.
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

// jsdom has no layout engine, so ResizeObserver never exists.
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

if (!Element.prototype.scrollTo) {
  Element.prototype.scrollTo = function scrollTo() {};
}

if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = function setPointerCapture() {};
}

if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = function releasePointerCapture() {};
}

// jsdom implements no DragEvent, so fireEvent.dragEnter/drop build a bare Event
// and silently discard clientX/clientY/dataTransfer. Without this, any component
// branch that reads drag coordinates (ChatInput's bounds check) is untestable.
if (typeof globalThis.DragEvent === 'undefined') {
  class DragEventPolyfill extends MouseEvent {
    dataTransfer: DataTransfer | null;

    constructor(type: string, init: MouseEventInit & { dataTransfer?: DataTransfer | null } = {}) {
      super(type, init);
      this.dataTransfer = init.dataTransfer ?? null;
    }
  }

  globalThis.DragEvent = DragEventPolyfill as unknown as typeof DragEvent;
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});