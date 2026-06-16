import '@testing-library/jest-dom';
import { vi, beforeAll, afterEach, afterAll } from 'vitest';

const windowRef = (globalThis.window ?? globalThis) as typeof globalThis & Window;

// Mock window.matchMedia
Object.defineProperty(windowRef, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
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

// Mock ResizeObserver as a class
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

// Mock IntersectionObserver as a class
class IntersectionObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  root: Element | null = null;
  rootMargin = '';
  thresholds: number[] = [];
}
global.IntersectionObserver = IntersectionObserverMock as unknown as typeof IntersectionObserver;

// Default runtime env for modules that read Docker-style window.__ERYXON_ENV__.
Object.defineProperty(windowRef, '__ERYXON_ENV__', {
  writable: true,
  configurable: true,
  value: {
    VITE_SUPABASE_URL: 'https://test.supabase.co',
    VITE_SUPABASE_PUBLISHABLE_KEY: 'test-publishable-key',
    VITE_SUPABASE_PROJECT_ID: 'test',
  },
});

// Mock scrollTo
windowRef.scrollTo = vi.fn();

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});
