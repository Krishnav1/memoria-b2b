import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['apps/studio/__tests__/**/*.test.ts', 'apps/studio/__tests__/**/*.test.tsx'],
    exclude: ['node_modules', 'dist', '.next'],
  },
})