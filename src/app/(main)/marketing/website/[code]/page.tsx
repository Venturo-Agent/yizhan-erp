'use client'

/**
 * /marketing/website/[code]
 *
 * 編輯某團的官網行銷資料：marketing_title / marketing_subtitle / marketing_body /
 * seo_title / seo_description + 封面 hero 圖。
 *
 * 動作：
 *   - 「儲存」：只更新欄位、不動 is_public_listed
 *   - 「儲存並上架」：欄位 + is_public_listed=true + published_at=now() + published_by=current employee
 *   - 封面圖：走 /api/storage/upload bucket=corner-website-assets、path=${workspaceId}/tours/<code>/hero.<ext>
 *
 * 防連點：所有寫入按鈕 disabled={saving}
 */

import { useEffect, useState, useCallback, use, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Megaphone, Save, Rocket, Loader2, Upload, ImageOff } from 'lucide-react'
import Image from 'next/image'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useWebsiteTours, invalidateWebsiteTours } from '@/data'
import { apiMutate } from '@/lib/swr/api-mutate'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

interface WebsiteTourDetail {
  id: string
  code: string
  name: string
  workspace_id: string
  is_public_listed: boolean
  marketing_title: string | null
  marketing_subtitle: string | null
  marketing_body: string | null
  hero_image_url: string | null
  seo_title: string | null
  seo_description: string | null
  published_at: string | null
}

interface FormState {
  marketing_title: string
  marketing_subtitle: string
  marketing_body: string
  hero_image_url: string
  seo_title: string
  seo_description: string
}

const EMPTY_FORM: FormState = {
  marketing_title: '',
  marketing_subtitle: '',
  marketing_body: '',
  hero_image_url: '',
  seo_title: '',
  seo_description: '',
}

export default function MarketingWebsiteEditPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = use(params)
  const router = useRouter()
  // 用 useWebsiteTours list、從中找 detail（避免再加 useWebsiteTour 一個 SWR key、5/19 健檢的建議）
  // 量大時可改用 useWebsiteTourDetail（已 export）、但目前 list 已含全部欄位、複用即可
  const { items: tours, loading: isLoading } = useWebsiteTours()
  const tour = (tours as unknown as WebsiteTourDetail[]).find((t) => t.code === code)
  const user = useAuthStore((s) => s.user)
  const workspaceId = user?.workspace_id

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState<'save' | 'publish' | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // tour 載入後一次性 sync 到 form（不會在每次 tour 變化時覆蓋使用者編輯）
  const initialized = useRef(false)
  useEffect(() => {
    if (!tour || initialized.current) return
    setForm({
      marketing_title: tour.marketing_title ?? '',
      marketing_subtitle: tour.marketing_subtitle ?? '',
      marketing_body: tour.marketing_body ?? '',
      hero_image_url: tour.hero_image_url ?? '',
      seo_title: tour.seo_title ?? '',
      seo_description: tour.seo_description ?? '',
    })
    initialized.current = true
  }, [tour])

  const handleSave = useCallback(
    async (publish: boolean) => {
      if (saving || !tour) return
      setSaving(publish ? 'publish' : 'save')
      try {
        const res = await apiMutate(`/api/marketing/website/${code}`, {
          method: 'PUT',
          body: {
            marketing_title: form.marketing_title || null,
            marketing_subtitle: form.marketing_subtitle || null,
            marketing_body: form.marketing_body || null,
            hero_image_url: form.hero_image_url || null,
            seo_title: form.seo_title || null,
            seo_description: form.seo_description || null,
            publish_now: publish,
          },
        })
        if (!res.ok) {
          toast.error(res.error || '儲存失敗')
          return
        }
        toast.success(publish ? '已儲存並上架' : '已儲存')
        await invalidateWebsiteTours()
        if (publish) {
          router.push('/marketing/website')
        }
      } catch (err) {
        logger.error('save website tour failed', err)
        toast.error('儲存失敗')
      } finally {
        setSaving(null)
      }
    },
    [code, form, router, saving, tour]
  )

  const handleUpload = useCallback(
    async (file: File) => {
      if (uploading || !workspaceId) {
        toast.error(workspaceId ? '處理中' : '尚未取得 workspace')
        return
      }
      // 副檔名（保留原檔、避免重 encoding）
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
      const safeExt = ['png', 'jpg', 'jpeg', 'webp', 'avif'].includes(ext) ? ext : 'png'

      // path 必須以 workspace_id 開頭（/api/storage/upload 紅線檢查）
      // 加 timestamp 防 CDN cache 卡舊圖
      const ts = Date.now()
      const path = `${workspaceId}/tours/${code}/hero-${ts}.${safeExt}`

      setUploading(true)
      try {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('bucket', 'corner-website-assets')
        fd.append('path', path)

        const res = await fetch('/api/storage/upload', { method: 'POST', body: fd })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) {
          toast.error(body?.error || `上傳失敗 HTTP ${res.status}`)
          return
        }
        // upload route 回 { success, data: { path, publicUrl } }（看 route 結構）
        const publicUrl: string | undefined =
          body?.data?.publicUrl || body?.publicUrl || body?.data?.url
        if (!publicUrl) {
          toast.error('上傳成功但拿不到圖片 URL')
          return
        }
        setForm((prev) => ({ ...prev, hero_image_url: publicUrl }))
        toast.success('封面圖上傳成功、記得按「儲存」')
      } catch (err) {
        logger.error('upload hero image failed', err)
        toast.error('上傳失敗')
      } finally {
        setUploading(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    },
    [code, uploading, workspaceId]
  )

  if (isLoading) {
    return (
      <ContentPageLayout
        title="官網行程編輯"
        icon={Megaphone}
        breadcrumb={[
          { label: '行銷管理', href: '/marketing/website' },
          { label: '官網管理', href: '/marketing/website' },
          { label: code, href: `/marketing/website/${code}` },
        ]}
      >
        <div className="flex items-center justify-center py-12 text-morandi-secondary">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          載入中...
        </div>
      </ContentPageLayout>
    )
  }

  if (!tour) {
    return (
      <ContentPageLayout
        title="官網行程編輯"
        icon={Megaphone}
        breadcrumb={[
          { label: '行銷管理', href: '/marketing/website' },
          { label: '官網管理', href: '/marketing/website' },
        ]}
      >
        <Card className="p-12 text-center text-morandi-secondary">
          <p className="text-sm">找不到團號 {code}、可能已被刪除或不在此 workspace</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push('/marketing/website')}>
            回列表
          </Button>
        </Card>
      </ContentPageLayout>
    )
  }

  return (
    <ContentPageLayout
      title={`官網行程編輯 · ${tour.code}`}
      icon={Megaphone}
      breadcrumb={[
        { label: '行銷管理', href: '/marketing/website' },
        { label: '官網管理', href: '/marketing/website' },
        { label: tour.code, href: `/marketing/website/${tour.code}` },
      ]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 左：行銷文案表單 */}
        <Card className="lg:col-span-2 p-5 space-y-4">
          <div>
            <div className="text-xs text-morandi-muted">內部團名</div>
            <div className="text-sm text-morandi-primary">{tour.name}</div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="marketing_title">官網標題</Label>
            <Input
              id="marketing_title"
              value={form.marketing_title}
              onChange={(e) =>
                setForm((p) => ({ ...p, marketing_title: e.target.value }))
              }
              placeholder="例如：京都春櫻 7 日（不用內部團名）"
              maxLength={120}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="marketing_subtitle">副標一句話</Label>
            <Input
              id="marketing_subtitle"
              value={form.marketing_subtitle}
              onChange={(e) =>
                setForm((p) => ({ ...p, marketing_subtitle: e.target.value }))
              }
              placeholder="例如：跟著當地人吃京懷石、賞夜櫻"
              maxLength={160}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="marketing_body">行程介紹（markdown）</Label>
            <Textarea
              id="marketing_body"
              value={form.marketing_body}
              onChange={(e) =>
                setForm((p) => ({ ...p, marketing_body: e.target.value }))
              }
              rows={10}
              placeholder="可用 markdown：### 第一天\n抵達關西機場..."
            />
          </div>

          <div className="border-t border-morandi-border pt-4 space-y-4">
            <div className="text-xs text-morandi-muted">SEO（Google 搜尋結果顯示）</div>

            <div className="space-y-2">
              <Label htmlFor="seo_title">SEO 標題</Label>
              <Input
                id="seo_title"
                value={form.seo_title}
                onChange={(e) =>
                  setForm((p) => ({ ...p, seo_title: e.target.value }))
                }
                placeholder="留空 = 用官網標題"
                maxLength={70}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="seo_description">SEO 描述</Label>
              <Textarea
                id="seo_description"
                value={form.seo_description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, seo_description: e.target.value }))
                }
                rows={3}
                placeholder="留空 = 用副標"
                maxLength={200}
              />
            </div>
          </div>
        </Card>

        {/* 右：封面圖 + 狀態 */}
        <div className="space-y-4">
          <Card className="p-5 space-y-3">
            <div className="text-xs text-morandi-muted">封面圖</div>
            {form.hero_image_url ? (
              <div className="relative w-full aspect-video bg-morandi-container/40 rounded-md overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.hero_image_url}
                  alt="封面預覽"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center w-full aspect-video bg-morandi-container/20 rounded-md text-morandi-muted">
                <ImageOff className="w-8 h-8 mb-1" />
                <span className="text-xs">尚未上傳封面圖</span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/avif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleUpload(file)
              }}
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              {form.hero_image_url ? '更換封面' : '上傳封面'}
            </Button>
            <p className="text-[0.687rem] text-morandi-muted leading-relaxed">
              建議比例 16:9、最大 10 MB、支援 PNG / JPG / WebP / AVIF。
              <br />
              上傳後記得按下方「儲存」、否則重整會遺失新 URL。
            </p>
          </Card>

          <Card className="p-5 space-y-2 text-xs text-morandi-secondary">
            <div className="flex items-center justify-between">
              <span className="text-morandi-muted">官網上架狀態</span>
              <span
                className={
                  tour.is_public_listed
                    ? 'text-morandi-gold font-medium'
                    : 'text-morandi-muted'
                }
              >
                {tour.is_public_listed ? '上架中' : '未上架'}
              </span>
            </div>
            {tour.published_at && (
              <div className="flex items-center justify-between">
                <span className="text-morandi-muted">最近發布</span>
                <span>{tour.published_at.slice(0, 16).replace('T', ' ')}</span>
              </div>
            )}
          </Card>

          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={() => handleSave(false)}
              disabled={saving !== null}
            >
              {saving === 'save' && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {saving !== 'save' && <Save className="w-4 h-4 mr-2" />}
              儲存
            </Button>
            <Button
              onClick={() => handleSave(true)}
              disabled={saving !== null}
            >
              {saving === 'publish' && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {saving !== 'publish' && <Rocket className="w-4 h-4 mr-2" />}
              儲存並上架
            </Button>
            <p className="text-[0.687rem] text-morandi-muted leading-relaxed mt-1">
              「儲存並上架」會自動把 is_public_listed 設成 true、
              記錄發布時間 + 發布人、回到列表頁。
              <br />
              真正觸發官網 rebuild 在列表頁按「重新發布官網」。
            </p>
          </div>
        </div>
      </div>
    </ContentPageLayout>
  )
}
