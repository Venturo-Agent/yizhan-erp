// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a user loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 生產 5%、開發 100%（業界標準、降 95% CPU/網路負擔）
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  replaysOnErrorSampleRate: 1.0,

  // Production session replay: 1% sample（從 10% 降、估省 90% replay 上傳流量）
  // errors 仍 100% 全錄（replaysOnErrorSampleRate: 1.0）、不影響 debug
  replaysSessionSampleRate: 0.01,

  // You can remove this option if you're not planning to use the Sentry Session Replay feature:
  integrations: [
    Sentry.replayIntegration({
      // Additional Replay configuration goes in here, for example:
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Only initialize Sentry if DSN is configured
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
})
