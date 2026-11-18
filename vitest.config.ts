import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.git'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/test/**',
        'src/**/*.d.ts',
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/integrations/supabase/types/**',
      ],
    },
    // Mock heavy dependencies
    deps: {
      inline: ['@supabase/supabase-js'],
    },
  },
  resolve: {
    alias: {
      // vite-plugin-pwa's virtual module only exists in a real Vite build;
      // point it at a stub so components that import it stay testable.
      'virtual:pwa-register/react': path.resolve(
        __dirname,
        './src/test/mocks/pwa-register-react.ts',
      ),
      '@': path.resolve(__dirname, './src'),
    },
  },
});
