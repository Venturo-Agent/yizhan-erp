import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <h1 className="text-7xl font-bold mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-2">找不到頁面</h2>
        <p className="text-morandi-secondary mb-8">很抱歉，您訪問的頁面不存在</p>
        <Link
          href="/dashboard"
          className="inline-block px-6 py-2 rounded-md font-medium [background:var(--btn-primary-bg)] [color:var(--btn-primary-fg)] [border-color:var(--btn-primary-border)] border font-semibold transition-[filter] hover:brightness-[.96] active:brightness-[.92]"
        >
          返回首頁
        </Link>
      </div>
    </div>
  )
}
