import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:5173',
  },
  // Run tests one at a time so they don't interfere with each other
  workers: 1,
});
