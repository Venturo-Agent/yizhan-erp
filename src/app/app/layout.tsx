import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AppTabBar } from './components/AppTabBar'

export const metadata: Metadata = {
  title: 'VENTURO App',
  description: 'VENTURO ERP - 旅遊業管理系統',
  manifest: '/app-manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'VENTURO',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#3B82F6',
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="app-shell">
      <main className="app-content">{children}</main>
      <AppTabBar />
    </div>
  )
}