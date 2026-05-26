import { useTranslations } from 'next-intl'
import {
  MapPin,
  Trash2,
  Power,
  SquarePen,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react'

const COMPONENT_LABELS = {
  PENDING_VERIFY: '待驗證',
} as const
import { EmptyValue } from '@/components/ui/empty-value'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { EnhancedTable } from '@/components/ui/enhanced-table'
import { Attraction } from '../_types'
import type { Country, City } from '@/stores/region-store'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// ============================================
// 景點列表組件（使用 EnhancedTable）
// ============================================

interface AttractionsListProps {
  loading: boolean
  sortedAttractions: Attraction[]
  countries: Country[]
  cities: City[]
  onEdit: (attraction: Attraction) => void
  onToggleStatus: (attraction: Attraction) => void
  onDelete: (id: string) => void
  onAddNew: () => void
  onMoveUp?: (attraction: Attraction) => void
  onMoveDown?: (attraction: Attraction) => void
}

export function AttractionsList({
  loading,
  sortedAttractions,
  countries: _countries,
  cities: _cities,
  onEdit,
  onToggleStatus,
  onDelete,
  onMoveUp,
  onMoveDown,
}: AttractionsListProps) {
  const t = useTranslations('library')
  // 定義表格欄位
  const columns = [
    {
      key: 'image',
      label: t('attractionsListImage'),
      sortable: false,
      render: (_: unknown, attraction: Attraction) => (
        <div className="w-20">
          {attraction.images && attraction.images.length > 0 ? (
            <img
              src={attraction.images[0]}
              alt={attraction.name}
              className="w-20 h-14 object-cover rounded border border-border shadow-sm"
            />
          ) : (
            <div className="w-20 h-14 bg-morandi-container/30 rounded border border-border flex items-center justify-center">
              <MapPin size={16} className="text-morandi-muted opacity-40" />
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'name',
      label: t('attractionsListName'),
      sortable: true,
      render: (_: unknown, attraction: Attraction) => {
        const verified = attraction.data_verified ?? false
        return (
          <div className="min-w-[180px] flex items-start gap-1.5">
            {!verified && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertTriangle size={14} className="text-status-warning mt-1 flex-shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{COMPONENT_LABELS.PENDING_VERIFY}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <div>
              <div className="font-medium text-morandi-primary line-clamp-1">{attraction.name}</div>
              {attraction.english_name && (
                <div className="text-xs text-morandi-muted line-clamp-1">
                  {attraction.english_name}
                </div>
              )}
            </div>
          </div>
        )
      },
    },
    {
      key: 'category',
      label: t('attractionsListCategory'),
      sortable: true,
      render: (_: unknown, attraction: Attraction) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-morandi-blue/10 text-morandi-blue">
          {attraction.category || <EmptyValue />}
        </span>
      ),
    },
    {
      key: 'description',
      label: t('attractionsListDescription'),
      sortable: false,
      render: (_: unknown, attraction: Attraction) => (
        <div className="min-w-[200px] text-sm text-morandi-secondary">
          <p className="line-clamp-2 leading-relaxed">
            {attraction.description || t('attractionsListNoDescription')}
          </p>
        </div>
      ),
    },
    {
      key: 'duration_minutes',
      label: t('attractionsListDuration'),
      sortable: true,
      render: (_: unknown, attraction: Attraction) => (
        <div className="text-center text-sm text-morandi-secondary">
          {attraction.duration_minutes ? `${Math.floor(attraction.duration_minutes / 60)}h` : '-'}
        </div>
      ),
    },
    {
      key: 'tags',
      label: t('attractionsListTags'),
      sortable: false,
      render: (_: unknown, attraction: Attraction) => (
        <div className="flex flex-wrap gap-1 min-w-[120px]">
          {attraction.tags?.slice(0, 2).map((tag, idx) => (
            <span
              key={idx}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-morandi-container text-morandi-secondary"
            >
              {tag}
            </span>
          ))}
          {(attraction.tags?.length || 0) > 2 && (
            <span className="text-xs text-morandi-muted">
              +{(attraction.tags?.length || 0) - 2}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'is_active',
      label: t('attractionsListStatus'),
      sortable: true,
      render: (_: unknown, attraction: Attraction) => (
        <span
          className={cn(
            'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
            attraction.is_active
              ? 'bg-morandi-green/80 text-white'
              : 'bg-morandi-container text-morandi-secondary'
          )}
        >
          {attraction.is_active ? t('attractionsListEnable') : t('attractionsListDisable')}
        </span>
      ),
    },
  ]

  return (
    <EnhancedTable
      columns={columns as unknown as Parameters<typeof EnhancedTable>[0]['columns']}
      data={sortedAttractions}
      loading={loading}
      onRowClick={onEdit as (row: unknown) => void}
      initialPageSize={15}
      actions={(row: unknown, index: number) => {
        const attraction = row as Attraction
        const isFirst = index === 0
        const isLast = index === sortedAttractions.length - 1
        return (
          <div className="flex items-center gap-0.5">
            {/* 上移/下移按鈕 */}
            {onMoveUp && onMoveDown && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={e => {
                    e.stopPropagation()
                    onMoveUp(attraction)
                  }}
                  disabled={isFirst}
                  className="h-7 w-7 p-0 text-morandi-secondary hover:bg-morandi-container disabled:opacity-30"
                  title={t('attractionsListMoveUp')}
                >
                  <ChevronUp size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={e => {
                    e.stopPropagation()
                    onMoveDown(attraction)
                  }}
                  disabled={isLast}
                  className="h-7 w-7 p-0 text-morandi-secondary hover:bg-morandi-container disabled:opacity-30"
                  title={t('attractionsListMoveDown')}
                >
                  <ChevronDown size={14} />
                </Button>
                <div className="w-px h-4 bg-border mx-1" />
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={e => {
                e.stopPropagation()
                onEdit(attraction)
              }}
              className="h-8 px-2 text-morandi-blue hover:bg-morandi-blue/10"
              title={t('attractionsListEdit')}
            >
              <SquarePen size={14} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={e => {
                e.stopPropagation()
                onToggleStatus(attraction)
              }}
              className="h-8 px-2"
              title={
                attraction.is_active ? t('attractionsListDisable') : t('attractionsListEnable')
              }
            >
              <Power
                size={14}
                className={attraction.is_active ? 'text-morandi-green' : 'text-morandi-secondary'}
              />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={e => {
                e.stopPropagation()
                onDelete(attraction.id)
              }}
              className="h-8 px-2 hover:text-morandi-red hover:bg-morandi-red/10"
              title={t('attractionsListDelete')}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        )
      }}
    />
  )
}
