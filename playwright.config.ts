import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  timeout: 60000,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run build && npx next start -p 3000',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 300000,
    env: {
      E2E_MOCK_MODE: '1',
      NEXT_PUBLIC_SUPABASE_URL: 'https://mock-project.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'mock-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'mock-service-role-key',
      GOOGLE_GENERATIVE_AI_API_KEY: 'mock-api-key',
      NEXT_PUBLIC_SENTRY_DSN: '',
      NEXT_PUBLIC_E2E_MOCK_MODE: '1',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
