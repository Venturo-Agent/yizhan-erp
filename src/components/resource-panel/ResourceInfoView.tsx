'use client'

import { MapPin, Phone, Globe, Clock, Timer, Ticket, StickyNote, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const LABELS = {
  SUGGESTED_DURATION_PREFIX: '建議',
  SUGGESTED_DURATION_SUFFIX: '分鐘',
} as const

interface ResourceInfoViewProps {
  resourceName: string
  resourceCategory?: string | null
  resourceLatitude?: number | null
  resourceLongitude?: number | null
  fullData: Record<string, unknown>
  googleMapsUrl: string | null
}

export function ResourceInfoView({
  resourceName,
  resourceCategory,
  resourceLatitude,
  resourceLongitude,
  fullData,
  googleMapsUrl,
}: ResourceInfoViewProps) {
  const hasCoordinates = resourceLatitude && resourceLongitude

  return (
    <>
      {/* 名稱 */}
      <div>
        <h3 className="text-lg font-semibold">
          {String(fullData?.name || resourceName)}
        </h3>
        {resourceCategory && (
          <Badge variant="secondary" className="mt-1">
            {resourceCategory}
          </Badge>
        )}
      </div>

      {/* 地址 */}
      {(fullData?.address) ? (
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <MapPin size="0.875em" className="mt-0.5 flex-shrink-0" />
          <span>{String(fullData.address)}</span>
        </div>
      ) : null}

      {/* 描述 */}
      {fullData?.description ? (
        <p className="text-sm text-muted-foreground leading-relaxed">
          {String(fullData.description)}
        </p>
      ) : null}

      {/* 額外資訊 */}
      <div className="space-y-2 text-sm">
        {/* 電話 */}
        {fullData.phone ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone size="0.875em" className="shrink-0" />
            <span>{String(fullData.phone)}</span>
          </div>
        ) : null}
        {/* 網站 */}
        {fullData.website ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Globe size="0.875em" className="shrink-0" />
            <a
              href={String(fullData.website)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-status-info hover:underline truncate"
            >
              {String(fullData.website)}
            </a>
          </div>
        ) : null}
        {/* 營業時間 */}
        {fullData.opening_hours ? (
          <div className="flex items-start gap-2 text-muted-foreground">
            <Clock size="0.875em" className="shrink-0 mt-0.5" />
            <span>
              {typeof fullData.opening_hours === 'string'
                ? fullData.opening_hours
                : Object.entries(fullData.opening_hours as Record<string, string>)
                    .map(([key, val]) => (key === 'daily' ? val : `${key}: ${val}`))
                    .join('、')}
            </span>
          </div>
        ) : null}
        {/* 建議遊玩時間 */}
        {fullData.duration_minutes ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Timer size="0.875em" className="shrink-0" />
            <span>{LABELS.SUGGESTED_DURATION_PREFIX} {String(fullData.duration_minutes)} {LABELS.SUGGESTED_DURATION_SUFFIX}</span>
          </div>
        ) : null}
        {/* 票價 */}
        {fullData.ticket_price ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Ticket size="0.875em" className="shrink-0" />
            <span>{String(fullData.ticket_price)}</span>
          </div>
        ) : null}
        {/* 備註 */}
        {fullData.notes ? (
          <div className="flex items-start gap-2 text-muted-foreground">
            <StickyNote size="0.875em" className="shrink-0 mt-0.5" />
            <span>{String(fullData.notes)}</span>
          </div>
        ) : null}
      </div>

      {/* 座標 & 地圖連結 */}
      {hasCoordinates && (
        <div className="flex items-center gap-2 pt-2 border-t">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin size="0.75em" /> {resourceLatitude?.toFixed(4)},{' '}
            {resourceLongitude?.toFixed(4)}
          </span>
          {googleMapsUrl && (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-status-info hover:underline flex items-center gap-1"
            >
              Google Maps <ExternalLink size="0.625em" />
            </a>
          )}
        </div>
      )}
    </>
  )
}
