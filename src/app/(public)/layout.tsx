/**
 * 公開頁面 Layout
 * 不需要登入驗證
 */

import { Toaster } from 'sonner'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster position="top-center" richColors />
    </>
  )
}
