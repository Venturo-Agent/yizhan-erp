'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Link2, Check, Copy, ExternalLink } from 'lucide-react'

interface PublishPreviewProps {
  shareUrl: string | null
  copied: boolean
  onCopy: () => void
}

export function PublishPreview({ shareUrl, copied, onCopy }: PublishPreviewProps) {
  // 已從 PUBLISH_LABELS (constants/labels.ts) 遷移至 next-intl messages/zh-TW.json#publish
  const t = useTranslations('publish')

  if (!shareUrl) return null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="soft-gold"
          className="h-8 px-3 border-morandi-green/30 bg-morandi-green/10 hover:bg-morandi-green/10 text-morandi-green"
        >
          <Link2 size="0.875em" className="mr-1.5" />
          {t('link')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="end">
        <div className="space-y-2">
          <div className="text-sm font-medium text-morandi-primary">{t('shareLink')}</div>
          <div className="flex items-center gap-2">
            <Input value={shareUrl} readOnly className="text-xs h-8 bg-muted" />
            <Button
              size="sm"
              variant="soft-gold"
              className="h-8 px-2 flex-shrink-0"
              onClick={onCopy}
            >
              {copied ? <Check size="0.875em" /> : <Copy size="0.875em" />}
            </Button>
            <Button size="sm" variant="soft-gold" className="h-8 px-2 flex-shrink-0" asChild>
              <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink size="0.875em" />
              </a>
            </Button>
          </div>
          <p className="text-xs text-morandi-secondary">{t('shareLinkDesc')}</p>
        </div>
      </PopoverContent>
    </Popover>
  )
}
