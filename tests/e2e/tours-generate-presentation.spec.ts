/**
 * E2E：POST /api/tours/[code]/generate-presentation（旅遊團產簡報 PPTX）
 *
 * 守的是「資安契約」（這支端點是同事新加、最該確認守門有接上）：
 *   ① 未登入 → 被擋（401/403）、絕不外洩簡報
 *   ② 已登入 + 不存在/不在自己 workspace 的團 → 絕不回 200 簡報
 *
 * happy path（引擎真的產出 PPTX）設計成 opt-in：
 *   需要一個已知測試團 code（env TEST_TOUR_CODE）才跑。
 *   原因：headless 下實際下載流程有坑、且需要 seeded 展示 canvas；
 *   引擎實際產出由人工點一次「產簡報」驗證最實在（William 5/30 手測）。
 */

import { test } from './fixtures/auth.fixture'
import { expect, request as playwrightRequest } from '@playwright/test'

// 後端 body：canvas 物件 + template（目前引擎只有 playful）
const MINIMAL_BODY = {
  canvas: { theme: 'classic', sections: [] },
  template: 'playful',
}

// happy path 用：帶一個最小封面、讓引擎有東西可畫
const HAPPY_BODY = {
  canvas: {
    theme: 'classic',
    brand: { name: 'VENTURO 測試' },
    sections: [
      {
        type: 'cover',
        data: {
          eyebrow: '測試',
          title: '測試行程簡報',
          subtitle: '',
          destination: '',
          departure_date: '',
        },
      },
    ],
  },
  template: 'playful',
}

const PPTX_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'

test.describe('POST /api/tours/[code]/generate-presentation 守門', () => {
  test('未登入 → 被擋（401/403）、不外洩簡報', async ({ baseURL }) => {
    // 全新 request context、刻意不帶任何登入 session
    const ctx = await playwrightRequest.newContext({ baseURL, storageState: undefined })
    const res = await ctx.post('/api/tours/ANYCODE/generate-presentation', { data: MINIMAL_BODY })
    expect([401, 403]).toContain(res.status())
    await ctx.dispose()
  })

  test('已登入 + 不存在的團 → 絕不回 200 簡報', async ({ authenticatedPage }) => {
    const res = await authenticatedPage.request.post(
      '/api/tours/__NO_SUCH_TOUR__/generate-presentation',
      { data: MINIMAL_BODY }
    )
    // 有權限 → 404 找不到團；無權限 → 403。重點：永遠不該是 200。
    expect(res.status()).not.toBe(200)
    expect([403, 404]).toContain(res.status())
  })

  test('happy path：已知測試團能產出 PPTX（需 env TEST_TOUR_CODE）', async ({
    authenticatedPage,
  }) => {
    const code = process.env.TEST_TOUR_CODE
    test.skip(!code, '未設 TEST_TOUR_CODE、跳過實際產出測試（引擎產出由人工驗證）')

    const res = await authenticatedPage.request.post(`/api/tours/${code}/generate-presentation`, {
      data: HAPPY_BODY,
    })
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toContain(PPTX_CONTENT_TYPE)
    expect(res.headers()['content-disposition'] || '').toMatch(/attachment.*\.pptx/)
  })
})
