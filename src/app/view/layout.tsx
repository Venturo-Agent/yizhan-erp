'use client'

/**
 * 公開分享頁面的 Layout
 * 不需要登入驗證，讓客戶可以直接查看行程表
 */
export default function ViewLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-morandi-background">{children}</div>
}
