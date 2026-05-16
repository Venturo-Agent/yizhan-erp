/**
 * Production critical path 獨立 config
 * 用法：npx playwright test --config=tests/e2e/critical-path-prod.config.ts
 *
 * 跟主 playwright.config.ts 區別：
 *   - 沒 globalSetup（不需先登入存 storageState）
 *   - 沒 storageState（每個 test 自己 login）
 *   - baseURL = production
 *   - 只跑 critical-path-prod.spec.ts
 */

import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  testMatch: '**/critical-path-prod.spec.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  reporter: [['list']],
  use: {
    baseURL: 'https://erp.venturo.tw',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
})
