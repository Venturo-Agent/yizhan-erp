// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 生產 5%、開發 100%（業界標準、降 95% CPU/網路負擔）
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Only initialize Sentry if DSN is configured
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
})
