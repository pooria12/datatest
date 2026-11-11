import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Worker tests run in the node environment (see tests/health.test.ts), where there is no DOM.
const hasDom = typeof window !== 'undefined';

if (hasDom) {
  // jsdom has no matchMedia; the theme store needs it for the "system" preference.
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// jsdom provides a real localStorage; reset shared state so tests stay independent.
afterEach(() => {
  if (!hasDom) return;
  cleanup();
  localStorage.clear();
  document.documentElement.classList.remove('dark');
});
