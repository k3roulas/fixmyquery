import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/lib/**', 'src/app/api/**'],
      exclude: ['src/lib/db/**'],
      reporter: ['text', 'text-summary', 'html'],
      reportsDirectory: 'coverage',
    },
  },
});
