import { Metadata, Viewport } from 'next'

// 禁止縮放，避免簽名時誤觸縮放
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  title: '合約簽署',
}

export default function ContractSignLayout({ children }: { children: React.ReactNode }) {
  return children
}
