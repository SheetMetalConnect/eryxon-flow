/**
 * Vitest stand-in for `virtual:pwa-register/react`, which only exists inside
 * a real Vite build (vite-plugin-pwa provides it). Tests mock `useRegisterSW`
 * via vi.mock; this module just satisfies import resolution.
 */
export function useRegisterSW(): never {
  throw new Error(
    "useRegisterSW stub called — mock virtual:pwa-register/react in your test",
  );
}
