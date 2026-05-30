'use client'

/**
 * TenantPrepSection — 新增租戶時「該準備的資料」提醒
 *
 * 純提醒、不上傳。依當前方案 + 可選功能動態浮現。
 * 沒勾對應 feature 就不顯示、避免要客戶準備他不會用的東西。
 */

import { FileText } from 'lucide-react'

interface PrepItem {
  feature: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  items: string[]
}

const PREP_LIST: ReadonlyArray<PrepItem> = [
  // travel_invoice 條目移除（2026-05-23）：travel_invoice 模組已凍、客戶傳了沒地方放、會撞 onboarding 流程
  {
    feature: 'tours.contract',
    icon: FileText,
    title: '電子合約',
    items: ['旅遊定型化契約樣本 PDF（公司版本、含條款）'],
  },
]

interface Props {
  selectedFeatures: string[]
}

export function TenantPrepSection({ selectedFeatures }: Props) {
  const visible = PREP_LIST.filter(item => selectedFeatures.includes(item.feature))
  if (visible.length === 0) return null

  return (
    <section className="rounded-xl border border-morandi-gold/25 bg-morandi-gold/5 p-4 space-y-3">
      <div>
        <p className="text-sm font-medium text-morandi-primary">該準備的資料</p>
        <p className="text-[11px] text-morandi-secondary mt-0.5">
          以下檔案需於建立後在租戶設定頁上傳、未上傳對應功能無法正常使用
        </p>
      </div>
      <div className="space-y-2.5">
        {visible.map(({ feature, icon: Icon, title, items }) => (
          <div key={feature} className="flex gap-2.5">
            <Icon className="h-4 w-4 text-morandi-gold flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-morandi-primary">{title}</p>
              <ul className="mt-0.5 space-y-0.5">
                {items.map(it => (
                  <li key={it} className="text-[11px] text-morandi-secondary">
                    ・{it}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
