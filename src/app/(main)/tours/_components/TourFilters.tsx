'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { ResponsiveHeader } from '@/components/layout/responsive-header'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Calendar, FileCheck, MapPin, BarChart3, Plus, FileText, Copy } from 'lucide-react'
import { TOUR_FILTERS } from '../_constants'
import { TOUR_STATUS } from '@/lib/constants/status-maps'

interface TourFiltersProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  activeTab: string
  onTabChange: (tab: string) => void
  onAddTour: () => void
  onAddProposal?: () => void
  onAddTemplate?: () => void
}

export const TourFilters: React.FC<TourFiltersProps> = ({
  searchQuery,
  onSearchChange,
  activeTab,
  onTabChange,
  onAddTour,
  onAddProposal,
  onAddTemplate,
}) => {
  const t = useTranslations('tour')
  // 封存分頁已隱藏（需要時從 DB archived=true 還是能取到）
  const tabs = [
    { value: TOUR_STATUS.UPCOMING, label: TOUR_FILTERS.tab_active, icon: Calendar },
    { value: 'all', label: TOUR_FILTERS.tab_all, icon: BarChart3 },
    { value: TOUR_STATUS.CLOSED, label: TOUR_FILTERS.tab_closed, icon: FileCheck },
    { value: TOUR_STATUS.PROPOSAL, label: TOUR_FILTERS.tab_proposals, icon: FileText },
    { value: TOUR_STATUS.TEMPLATE, label: TOUR_FILTERS.tab_templates, icon: Copy },
  ]

  return (
    <ResponsiveHeader
      title={TOUR_FILTERS.page_title}
      icon={MapPin}
      breadcrumb={[{ label: TOUR_FILTERS.breadcrumb_tours, href: '/tours' }]}
      showSearch={true}
      searchTerm={searchQuery}
      onSearchChange={onSearchChange}
      searchPlaceholder={TOUR_FILTERS.search_placeholder}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={onTabChange}
      actions={
        // Dropdown trigger 不能塞進結構化 primaryAction、走 headerActions escape hatch、Trigger 用 header-outline 統一視覺
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="header-outline" size="sm">
              <Plus />
              {t('filterAddProject')}
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onAddTour}>
              <Calendar className="mr-2 h-4 w-4" />
              {t('filterOpenTour')}
            </DropdownMenuItem>

            <DropdownMenuItem onClick={onAddProposal}>
              <FileText className="mr-2 h-4 w-4" />
              {t('filterProposal')}
            </DropdownMenuItem>

            <DropdownMenuItem onClick={onAddTemplate}>
              <Copy className="mr-2 h-4 w-4" />
              {t('filterOpenTemplate')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
    />
  )
}
