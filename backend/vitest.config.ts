import { defineConfig } from 'vitest/config';

// The "#domain/*", "#application/*" and "#infrastructure/*" imports in package.json point at
// src/ under the "source" condition and at the compiled dist/ otherwise. Tests must run the
// current source, not whatever was last built, so they resolve with that condition.
export default defineConfig({
  resolve: {
    conditions: ['source'],
  },
  ssr: {
    resolve: {
      conditions: ['source'],
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
