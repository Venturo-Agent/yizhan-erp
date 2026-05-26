import { useTranslations } from 'next-intl'
import { MapPin, Trash2, Power, Edit, ChevronUp, ChevronDown, AlertTriangle } from 'lucide-react'

const COMPONENT_LABELS = {
  PENDING_VERIFY: '待驗證',
} as const
import { EmptyValue } from '@/components/ui/empty-value'
import { Button } from '@/components/ui/button'
import {
  ActionCell,
  ACTION_BUTTON_BASE,
  ACTION_BUTTON_DEFAULT_TONE,
} from '@/components/table-cells'
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
              ? 'bg-status-success/80 text-white'
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
        const hasMove = !!(onMoveUp && onMoveDown)
        return (
          <ActionCell
            className="gap-0.5"
            iconOnly
            // 逃生艙：上移/下移（disabled-opacity-30 + 群組後分隔線）與 Power（icon 顏色獨立於按鈕狀態）
            // 走 ActionCell 標準渲染接不住、故自訂渲染；編輯/刪除回 null 退回標準渲染。
            renderCustomButton={action => {
              if (action.label === t('attractionsListMoveUp')) {
                return (
                  <Button
                    key="move-up"
                    variant="ghost"
                    size="sm"
                    onClick={e => {
                      e.stopPropagation()
                      action.onClick()
                    }}
                    disabled={isFirst}
                    className={cn(
                      ACTION_BUTTON_BASE,
                      ACTION_BUTTON_DEFAULT_TONE,
                      'disabled:opacity-30'
                    )}
                    title={action.label}
                  >
                    <ChevronUp size="0.95em" />
                  </Button>
                )
              }
              if (action.label === t('attractionsListMoveDown')) {
                return (
                  <div key="move-down" className="flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={e => {
                        e.stopPropagation()
                        action.onClick()
                      }}
                      disabled={isLast}
                      className={cn(
                        ACTION_BUTTON_BASE,
                        ACTION_BUTTON_DEFAULT_TONE,
                        'disabled:opacity-30'
                      )}
                      title={action.label}
                    >
                      <ChevronDown size="0.95em" />
                    </Button>
                    <div className="w-px h-4 bg-border mx-1" />
                  </div>
                )
              }
              if (action.icon === Power) {
                return (
                  <Button
                    key="power"
                    variant="ghost"
                    size="sm"
                    onClick={e => {
                      e.stopPropagation()
                      action.onClick()
                    }}
                    className={cn(ACTION_BUTTON_BASE, ACTION_BUTTON_DEFAULT_TONE)}
                    title={action.label}
                  >
                    <Power
                      size="0.95em"
                      className={
                        attraction.is_active ? 'text-status-success' : 'text-morandi-secondary'
                      }
                    />
                  </Button>
                )
              }
              return null
            }}
            actions={[
              ...(hasMove
                ? [
                    {
                      icon: ChevronUp,
                      label: t('attractionsListMoveUp'),
                      onClick: () => onMoveUp!(attraction),
                    },
                    {
                      icon: ChevronDown,
                      label: t('attractionsListMoveDown'),
                      onClick: () => onMoveDown!(attraction),
                    },
                  ]
                : []),
              {
                icon: Edit,
                label: t('attractionsListEdit'),
                onClick: () => onEdit(attraction),
              },
              {
                icon: Power,
                label: attraction.is_active
                  ? t('attractionsListDisable')
                  : t('attractionsListEnable'),
                onClick: () => onToggleStatus(attraction),
              },
              {
                icon: Trash2,
                label: t('attractionsListDelete'),
                onClick: () => onDelete(attraction.id),
                variant: 'danger' as const,
              },
            ]}
          />
        )
      }}
    />
  )
}
