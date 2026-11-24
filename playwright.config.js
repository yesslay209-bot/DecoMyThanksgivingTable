import { defineConfig } from '@playwright/test';

// Uses the Chrome already installed on the machine (GitHub's Ubuntu runners have it),
// so no browser download is needed.
export default defineConfig({
  testDir: 'tests',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4180/',
    channel: 'chrome',
    trace: 'retain-on-failure',
  },
  // Builds its own copy WITHOUT Supabase keys (empty values override .env.local),
  // so browser tests never write to the real database.
  webServer: {
    command: 'npx vite build --outDir .e2e-dist --emptyOutDir --logLevel warn && npx vite preview --outDir .e2e-dist --port 4180 --strictPort --host 127.0.0.1',
    env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' },
    url: 'http://127.0.0.1:4180/',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
