'use client'

import { ContentPageLayout } from '@/components/layout/content-page-layout'

export default function AttractionPoolPage() {
  return (
    <ContentPageLayout title='景點圈管理'>
      <div className='space-y-4 rounded-lg border bg-card p-6'>
        <h2 className='text-lg font-semibold'>WIP — 第二刀做品管 UI</h2>
        <p className='text-sm text-muted-foreground'>
          這頁將從旅遊資料庫挑出真實可用景點、漫途員工逐筆蓋章入池、AI 排程只用入池的景點。
        </p>
        <ul className='ml-4 list-disc text-sm text-muted-foreground'>
          <li>待審清單（剛被助理抓進來、需要漫途員工判斷）</li>
          <li>已入池清單（蓋過章、AI 已可讀）</li>
          <li>每筆顯示完整度分數（0-100）+ 缺哪些欄位提醒</li>
          <li>批次蓋章 / 退章</li>
        </ul>
      </div>
    </ContentPageLayout>
  )
}
