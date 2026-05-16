import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function PublicTourLayout({ children }: { children: ReactNode }) {
  return children
}
