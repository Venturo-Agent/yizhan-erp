import { defineConfig, devices } from '@playwright/test'
import { config as loadEnv } from 'dotenv'
import { resolve } from 'path'

// 載入測試環境變數（TEST_COMPANY_CODE=TESTUX 等）
loadEnv({ path: resolve(__dirname, '.env.test.local') })

/**
 * Playwright 配置 - 全頁面 E2E 測試
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 4, // 本地跑 4 個平行，CI 跑 1 個
  timeout: 30000, // 每個測試最多 30 秒
  reporter: [['html'], ['list']],

  // 全域設定：登入一次，所有測試共用
  globalSetup: require.resolve('./tests/e2e/global-setup.ts'),

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure', // 失敗保留 trace（可互動回放）
    screenshot: 'only-on-failure',
    video: 'retain-on-failure', // 失敗保留錄影 MP4
    // 使用已儲存的登入狀態
    storageState: './tests/e2e/.auth/user.json',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
