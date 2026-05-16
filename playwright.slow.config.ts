import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright 慢速測試配置
 * 用於完整功能測試，每一步都慢慢來，方便觀察
 */
export default defineConfig({
  testDir: './tests/e2e/full',
  fullyParallel: false, // 不平行，一個一個跑
  forbidOnly: !!process.env.CI,
  retries: 0, // 不重試，看清楚錯誤
  workers: 1, // 只用一個 worker
  timeout: 60000, // 每個測試 60 秒

  reporter: [['html', { open: 'never' }], ['list']],

  // 全域設定：登入一次
  globalSetup: require.resolve('./tests/e2e/global-setup.ts'),

  use: {
    baseURL: 'http://localhost:3000',

    // 慢速動作 - 每個操作間隔 500ms
    actionTimeout: 10000,
    navigationTimeout: 30000,

    // 錄影和截圖
    video: 'on', // 每個測試都錄影
    screenshot: 'on', // 每一步都截圖
    trace: 'on', // 完整追蹤

    // 使用已儲存的登入狀態
    storageState: './tests/e2e/.auth/user.json',

    // 視窗大小
    viewport: { width: 1920, height: 1080 },

    // 減慢速度
    launchOptions: {
      slowMo: 300, // 每個操作慢 300ms
    },
  },

  projects: [
    {
      name: 'chromium-slow',
      use: {
        ...devices['Desktop Chrome'],
        // 開啟開發者工具方便 debug
        launchOptions: {
          slowMo: 300,
          // devtools: true, // 取消註解可開啟 DevTools
        },
      },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
})
