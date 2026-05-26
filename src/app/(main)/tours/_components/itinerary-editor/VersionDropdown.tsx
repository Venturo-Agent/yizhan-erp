'use client'
/**
 * VersionDropdown - 版本選擇下拉選單
 */

import { useTranslations } from 'next-intl'
import { History, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ItineraryVersionRecord, Itinerary } from '@/stores/types'
import { stripHtml } from '@/lib/utils/string-utils'
import { formatDateTime } from '@/lib/utils/format-date'

interface VersionDropdownProps {
  existingItinerary: Itinerary | undefined
  versionRecords: ItineraryVersionRecord[]
  selectedVersionIndex: number
  currentVersionName: string
  onVersionChange: (index: number) => void
}

export function VersionDropdown({
  existingItinerary,
  versionRecords,
  selectedVersionIndex,
  currentVersionName,
  onVersionChange,
}: VersionDropdownProps) {
  const t = useTranslations('tour')
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="soft-gold" size="sm" className="h-7 px-2 text-[0.647rem] gap-1">
          <History size={12} />
          {currentVersionName}
          <ChevronDown size={10} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 mb-2" align="start">
        <div className="px-2 py-1.5 text-xs font-medium text-morandi-primary border-b border-border">
          {t('versionHistoryLabel', {
            count: versionRecords.length > 0 ? versionRecords.length : 1,
          })}
        </div>
        {/* 主版本（當前狀態） */}
        <DropdownMenuItem
          className="flex items-center justify-between py-2 px-2 cursor-pointer hover:bg-morandi-container/50"
          onClick={() => onVersionChange(-1)}
        >
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-sm">
                {stripHtml(existingItinerary?.title) || t('versionMainVersion')}
              </span>
              <span className="text-[0.588rem] text-morandi-secondary bg-morandi-container px-1.5 py-0.5 rounded">
                {t('versionMainVersion')}
              </span>
            </div>
            <span className="text-xs text-morandi-secondary">
              {existingItinerary?.updated_at
                ? formatDateTime(existingItinerary.updated_at)
                : t('versionCurrentEditing')}
            </span>
          </div>
          {selectedVersionIndex === -1 && (
            <div className="text-xs bg-morandi-gold/15 text-morandi-gold px-1.5 py-0.5 rounded font-medium">
              {t('versionCurrent')}
            </div>
          )}
        </DropdownMenuItem>
        {/* 其他版本記錄 */}
        {versionRecords.map((record, index) => {
          const isCurrentVersion = selectedVersionIndex === index
          return (
            <DropdownMenuItem
              key={record.id}
              className="flex items-center justify-between py-2 px-2 cursor-pointer hover:bg-morandi-container/50"
              onClick={() => onVersionChange(index)}
            >
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-sm">
                    {record.note || t('versionNumber', { n: record.version })}
                  </span>
                </div>
                <span className="text-xs text-morandi-secondary">
                  {record.created_at ? formatDateTime(record.created_at) : ''}
                </span>
              </div>
              {isCurrentVersion && (
                <div className="text-xs bg-morandi-gold/15 text-morandi-gold px-1.5 py-0.5 rounded font-medium">
                  {t('versionCurrent')}
                </div>
              )}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
