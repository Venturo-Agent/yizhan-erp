import type { NextConfig } from 'next'
import bundleAnalyzer from '@next/bundle-analyzer'
import { withSentryConfig } from '@sentry/nextjs'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

const nextConfig: NextConfig = {
  // ✅ 啟用圖片優化（Next.js 15 內建優化）
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
      // Supabase storage host（從 NEXT_PUBLIC_SUPABASE_URL 派生、避免寫死 project ref）
      ...(process.env.NEXT_PUBLIC_SUPABASE_URL
        ? [
            {
              protocol: 'https' as const,
              hostname: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname,
            },
          ]
        : []),
      // 5/17 加：舊 Supabase project（venturo-erp）的 storage、attractions / hotels
      //        圖片是從那邊 migrate 過來、URL 還指向舊 host
      //        未來資料全搬完可以拿掉、但目前生產資料還在用、不加會炸 next/image
      {
        protocol: 'https' as const,
        hostname: 'wzvwmawpkapcmkfmkvav.supabase.co',
      },
      // 兼容所有 *.supabase.co 子網域、防其他 migrate 路徑漏抓
      {
        protocol: 'https' as const,
        hostname: '*.supabase.co',
      },
    ],
  },

  // 2026-05-23 Canvas 通用化、舊 /p/yongcheng-* 路由保留 redirect alias
  // 既有外連客戶（如有）不會壞、過渡期後可砍
  redirects: async () => [
    { source: '/p/yongcheng-demo', destination: '/p/canvas-demo', permanent: true },
    { source: '/p/tour/:code/yongcheng', destination: '/p/tour/:code/canvas', permanent: true },
  ],

  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
        },
        // SEC-007: 靜態 CSP 已移至 middleware.ts（nonce-based Strict CSP）
        // middleware 動態設的 header 優先於這裡、但保留註解作歷史記錄。
        // 原設定：
        // {
        //   key: 'Content-Security-Policy',
        //   value:
        //     "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; ...",
        // },
      ],
    },
    // B 類路由（客戶分享連結）：禁止搜尋引擎索引
    // 知道 link 才能看、但不希望被 Google 收錄、避免「site:erp.venturo.tw 搜得到客戶資料」
    {
      source: '/p/:path*',
      headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }],
    },
    {
      source: '/view/:path*',
      headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }],
    },
    {
      source: '/public/contract/:path*',
      headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }],
    },
  ],

  // TypeScript 錯誤已全部修復，不再需要忽略
  // typescript: {
  //   ignoreBuildErrors: true,
  // },

  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
    // 優化常用套件的 tree-shaking（只列實際安裝的、跟 package.json 對齊）
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-select',
      '@radix-ui/react-slider',
      '@radix-ui/react-visually-hidden',
      '@radix-ui/react-tabs',
      '@radix-ui/react-popover',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-switch',
      '@radix-ui/react-slot',
      '@dnd-kit/core',
      '@dnd-kit/sortable',
      '@hello-pangea/dnd',
      'browser-image-compression',
      'date-fns',
      '@supabase/supabase-js',
      'framer-motion',
    ],
  },

  // SEC-015: 只在 dev 環境允許本地/ngrok 跨域（production 不帶）
  ...(process.env.NODE_ENV === 'development'
    ? { allowedDevOrigins: ['frisky-masonic-mellissa.ngrok-free.dev', '192.168.1.181', '100.89.92.46', 'corner-mac-mini', '100.85.149.128'] }
    : {}),

  // ✅ 啟用 standalone 輸出模式（適合 Docker/Vercel 部署）
  output: 'standalone',

  // Next.js 16 使用 Turbopack 作為預設打包工具
  turbopack: {},
}

// Sentry 設定選項
const sentryWebpackPluginOptions = {
  // 只在生產環境且有 Sentry DSN 時才上傳 source maps
  silent: true,
  // disableLogger: true, // Deprecated, use webpack.treeshake.removeDebugLogging instead
  // 僅在有 auth token 時上傳
  hideSourceMaps: true,
}

export default withSentryConfig(
  withNextIntl(withBundleAnalyzer(nextConfig)),
  sentryWebpackPluginOptions
)
