import Link from 'next/link'
import {
  Clock,
  ScanLine,
  MessageSquare,
  LayoutDashboard,
  FileText,
  Wallet,
  ArrowRight,
  Check,
  Sparkles,
  Mail,
  ChevronRight,
} from 'lucide-react'
import { getCurrentYear } from '@/lib/tenant'

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-morandi-container/50 via-card to-morandi-gold/10">
      <div className="mx-auto max-w-5xl px-6 py-24 sm:py-32 text-center">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-morandi-primary leading-tight">
          旅行社的防錯系統
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-morandi-secondary max-w-2xl mx-auto leading-relaxed">
          報價、團控、收款，一個系統搞定。讓你準時下班。
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg bg-morandi-gold px-8 py-3.5 text-base font-semibold text-white shadow-md hover:bg-morandi-gold-hover transition-colors"
          >
            免費體驗
            <ArrowRight size="1.125em" />
          </Link>
          <a
            href="mailto:hello@venturo.app?subject=預約 Venturo Demo"
            className="inline-flex items-center gap-2 rounded-lg border border-morandi-muted bg-card px-8 py-3.5 text-base font-semibold text-morandi-primary shadow-sm hover:bg-morandi-container/50 transition-colors"
          >
            預約 Demo
          </a>
        </div>
      </div>
      {/* Decorative gradient blob */}
      <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-status-warning-bg/30 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-morandi-container/40 blur-3xl" />
    </section>
  )
}

const PAIN_POINTS = [
  {
    icon: Clock,
    before: '報價單做 40 分鐘',
    after: '5 分鐘搞定',
    description: '模板化報價，選團、選項目、自動算價，不再手動排版。',
  },
  {
    icon: ScanLine,
    before: '護照一筆一筆手打',
    after: 'OCR 掃描辨識',
    description: '拍照上傳，系統自動辨識護照資訊，錯誤率趨近於零。',
  },
  {
    icon: MessageSquare,
    before: 'LINE 翻半天找確認',
    after: '供應商溝通集中管理',
    description: '需求單、確認記錄、對帳，全部在同一個地方追蹤。',
  },
] as const

function PainPointsSection() {
  return (
    <section className="bg-card py-20 sm:py-24">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-morandi-primary">
          你的痛，我們懂
        </h2>
        <div className="mt-14 grid gap-8 sm:grid-cols-3">
          {PAIN_POINTS.map(point => (
            <div
              key={point.before}
              className="rounded-xl border border-border bg-morandi-container/50/50 p-6 transition-shadow hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-status-warning-bg text-status-warning">
                <point.icon size="1.5em" />
              </div>
              <div className="mt-5 flex items-center gap-2 text-sm">
                <span className="line-through text-morandi-muted">{point.before}</span>
                <ChevronRight size="0.875em" className="text-morandi-muted" />
                <span className="font-semibold text-status-warning">{point.after}</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-morandi-secondary">
                {point.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const FEATURES = [
  {
    icon: LayoutDashboard,
    title: '團控表',
    description: '即時掌握每團人數、機位、房間、餐食狀態。',
  },
  {
    icon: FileText,
    title: '報價單',
    description: '模板化快速報價，客戶線上確認，電子簽名。',
  },
  {
    icon: Wallet,
    title: '收款管理',
    description: '自動對帳、催收提醒、金流一目瞭然。',
  },
] as const

function FeaturesSection() {
  return (
    <section className="bg-morandi-container/50 py-20 sm:py-24">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-morandi-primary">
          一個系統，全部搞定
        </h2>
        <div className="mt-14 grid gap-8 sm:grid-cols-3">
          {FEATURES.map(feature => (
            <div
              key={feature.title}
              className="rounded-xl bg-card border border-border p-6 shadow-sm"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-morandi-container text-morandi-primary">
                <feature.icon size="1.5em" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-morandi-primary">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-morandi-secondary">
                {feature.description}
              </p>
              {/* Screenshot placeholder */}
              <div className="mt-4 flex h-36 items-center justify-center rounded-lg border-2 border-dashed border-border bg-morandi-container/50 text-sm text-morandi-muted">
                截圖預留區
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

interface PlanCardProps {
  name: string
  price: string
  period: string
  features: readonly string[]
  popular?: boolean
  badge?: string
}

function PlanCard({ name, price, period, features, popular, badge }: PlanCardProps) {
  return (
    <div
      className={`relative rounded-xl border p-6 ${
        popular
          ? 'border-status-warning/40 bg-status-warning-bg/30 shadow-lg ring-1 ring-status-warning/40'
          : 'border-border bg-card shadow-sm'
      }`}
    >
      {popular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-morandi-gold px-4 py-1 text-xs font-semibold text-white">
          最受歡迎
        </span>
      )}
      {badge && (
        <span className="inline-block rounded-full bg-cat-pink-bg px-3 py-0.5 text-xs font-semibold text-cat-pink mb-3">
          {badge}
        </span>
      )}
      <h3 className="text-lg font-semibold text-morandi-primary">{name}</h3>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-3xl font-bold text-morandi-primary">{price}</span>
        <span className="text-sm text-morandi-secondary">{period}</span>
      </div>
      <ul className="mt-6 space-y-3">
        {features.map(feat => (
          <li key={feat} className="flex items-start gap-2 text-sm text-morandi-secondary">
            <Check size="1em" className="mt-0.5 shrink-0 text-status-warning" />
            {feat}
          </li>
        ))}
      </ul>
      <Link
        href="/login"
        className={`mt-6 block w-full rounded-lg py-2.5 text-center text-sm font-semibold transition-colors ${
          popular
            ? 'bg-morandi-gold text-white hover:bg-morandi-gold-hover'
            : 'border border-morandi-muted bg-card text-morandi-primary hover:bg-morandi-container/50'
        }`}
      >
        開始使用
      </Link>
    </div>
  )
}

function PricingSection() {
  return (
    <section className="bg-card py-20 sm:py-24">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-morandi-primary">
          簡單透明的定價
        </h2>
        <p className="mt-3 text-center text-morandi-secondary">不綁年約，隨時可停。</p>
        <div className="mt-14 grid gap-8 sm:grid-cols-3">
          <PlanCard
            name="免費版"
            price="NT$0"
            period="/月"
            features={['1 位使用者', '5 團/月', '基本團控功能', '報價單範本']}
          />
          <PlanCard
            name="Pro"
            price="NT$1,990"
            period="/人/月"
            features={[
              '無限團數',
              'OCR 護照辨識',
              '收款管理',
              '供應商管理',
              '客製報價模板',
              '優先客服',
            ]}
            popular
          />
          <PlanCard
            name="創始會員"
            price="NT$995"
            period="/人/月"
            features={['Pro 全部功能', '永久 5 折優惠', '優先體驗新功能', '一對一導入協助']}
            badge="限前 50 家"
          />
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-border bg-morandi-container/50 py-12">
      <div className="mx-auto max-w-5xl px-6">
        <div className="grid gap-8 sm:grid-cols-2">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles size="1.25em" className="text-status-warning" />
              <span className="text-lg font-bold text-morandi-primary">Venturo</span>
            </div>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-morandi-secondary">
              專為台灣旅行社打造的營運管理系統。從報價到收款，讓繁瑣的日常作業變得簡單。
            </p>
          </div>
          <div className="sm:text-right">
            <h4 className="text-sm font-semibold text-morandi-primary">聯繫我們</h4>
            <a
              href="mailto:hello@venturo.app"
              className="mt-2 inline-flex items-center gap-1.5 text-sm text-morandi-secondary hover:text-status-warning transition-colors"
            >
              <Mail size="0.875em" />
              hello@venturo.app
            </a>
          </div>
        </div>
        <div className="mt-10 border-t border-border pt-6 text-center text-xs text-morandi-muted">
          © {getCurrentYear()} Venturo. All rights reserved.
        </div>
      </div>
    </footer>
  )
}

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <HeroSection />
      <PainPointsSection />
      <FeaturesSection />
      <PricingSection />
      <Footer />
    </main>
  )
}
