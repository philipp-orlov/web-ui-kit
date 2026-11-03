import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    // Node by default; a spec that needs a DOM says `// @vitest-environment jsdom`.
    environment: 'node',
    globals: true,
    env: { REPORT_FONTS: fileURLToPath(new URL('./testing/fonts', import.meta.url)) },
  },
});
