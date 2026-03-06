import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // Exclude Playwright E2E specs — they require the Playwright runner, not Vitest
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 85,
      },
      exclude: [
        'node_modules/',
        'dist/',
        '.next/',
        'coverage/',
      ],
    },
    // Use different environments based on file patterns.
    // happy-dom is used for unit tests — jsdom 28+ has a broken dependency on
    // html-encoding-sniffer v6 which requires @exodus/bytes as ESM-only,
    // causing all jsdom workers to crash. happy-dom has no such issue.
    environmentMatchGlobs: [
      ['tests/unit/**/*.test.{ts,tsx}', 'happy-dom'],
      ['tests/integration/**/*.test.{ts,tsx}', 'node'],
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Skip PostCSS for tests
  define: {
    'process.env.NODE_ENV': '"test"',
  },
});
