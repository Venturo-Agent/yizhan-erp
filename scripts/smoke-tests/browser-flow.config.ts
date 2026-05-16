import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  testMatch: ['browser-flow.spec.ts', 'verify-employee-scroll.spec.ts'],
  timeout: 60_000,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.SMOKE_BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
})
