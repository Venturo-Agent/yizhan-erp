import type { Metadata } from 'next'
import { Noto_Sans_TC } from 'next/font/google'
import { getLocale, getMessages } from 'next-intl/server'
import { headers } from 'next/headers'
import './globals.css'

const notoSansTC = Noto_Sans_TC({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-noto-sans-tc',
})
import { ThemeProvider } from '@/components/layout/theme-provider'
import { ErrorLogger } from '@/components/ErrorLogger'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AppInitializer } from '@/components/AppInitializer'
import { GlobalDialogs } from '@/lib/ui/alert-dialog'
import { SWRProvider } from '@/lib/swr'
import { IntlProvider } from '@/components/providers/IntlProvider'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: 'Venturo ERP',
  description: 'Venturo ERP — 旅遊業管理系統',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getLocale()
  const messages = await getMessages()

  // SEC-007：從 middleware 注入的 x-nonce header 取得 nonce
  // 必須傳給所有含 dangerouslySetInnerHTML 的 <script>，否則 Strict CSP 會擋掉
  const nonce = (await headers()).get('x-nonce') ?? ''

  return (
    <html
      lang={locale}
      className={notoSansTC.variable}
      // inline script 在第一個 paint 前讀 localStorage 設 data-theme / data-font-scale、
      // SSR 沒這些 attribute 是預期、別 hydration warn
      suppressHydrationWarning
    >
      <head>
        {/* 第一個 paint 之前套 theme / font-scale、避免重新整理閃爍或跑掉 */}
        {/* SEC-007：nonce 由 middleware 產生、讓 Strict CSP 放行此內聯 script */}
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `try{var d=document.documentElement;var t=localStorage.getItem('venturo-theme')||'morandi';var s=localStorage.getItem('venturo-font-scale')||'md';d.setAttribute('data-theme',t);d.setAttribute('data-font-scale',s);}catch(e){}`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased font-sans">
        <ErrorLogger />
        <GlobalDialogs />
        <Toaster position="top-right" richColors closeButton />
        <IntlProvider locale={locale} messages={messages}>
          <AppInitializer>
            <ErrorBoundary>
              <SWRProvider>
                <ThemeProvider>{children}</ThemeProvider>
              </SWRProvider>
            </ErrorBoundary>
          </AppInitializer>
        </IntlProvider>
      </body>
    </html>
  )
}
