import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'services/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['services/**/*.ts', 'middleware/**/*.ts', 'controllers/**/*.ts'],
      exclude: ['services/supabase.ts', 'src/**/*.test.ts'],
    },
  },
});
