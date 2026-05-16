'use client'

import React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Loader2, List } from 'lucide-react'
import type { FlightSegment } from './FlightSearchDialog'
import { COMP_EDITOR_LABELS } from '../../../constants/labels'

interface FlightSegmentCardProps {
  title: string
  flightData: {
    airline?: string
    flightNumber?: string
    departureDate?: string
    duration?: string
    departureAirport?: string
    departureTime?: string
    arrivalAirport?: string
    arrivalTime?: string
    hasMeal?: boolean
  }
  onFieldChange: (field: string, value: string | boolean) => void
  onSearch: () => void
  onRouteSearch: () => void
  isLoading: boolean
  // 多航段選擇
  segments?: FlightSegment[]
  onSelectSegment?: (segment: FlightSegment) => void
  onClearSegments?: () => void
  /** Feature flag：航班搜尋（workspace_features.flight_search）— false 隱藏「查詢航班」+「航線查」按鈕 */
  searchEnabled?: boolean
}

export function FlightSegmentCard({
  title,
  flightData,
  onFieldChange,
  onSearch,
  onRouteSearch,
  isLoading,
  segments,
  onSelectSegment,
  onClearSegments,
  searchEnabled = true,
}: FlightSegmentCardProps) {
  return (
    <div className="bg-background p-4 rounded-lg space-y-3 border border-border">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm text-[var(--morandi-primary)]">{title}</h3>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={flightData.hasMeal || false}
              onChange={e => onFieldChange('hasMeal', e.target.checked)}
              className="w-3.5 h-3.5 rounded border-border text-morandi-gold focus:ring-morandi-gold"
            />
            <span className="text-xs text-morandi-secondary">{COMP_EDITOR_LABELS.餐食}</span>
          </label>
          {searchEnabled && (
            <>
              <Button
                type="button"
                size="sm"
                variant="soft-gold"
                onClick={onSearch}
                disabled={isLoading || !flightData.flightNumber}
                className="h-7 text-xs gap-1"
              >
                {isLoading ? <Loader2 size="0.75em" className="animate-spin" /> : <Search size="0.75em" />}
                查詢航班
              </Button>
              <Button
                type="button"
                size="sm"
                variant="soft-gold"
                onClick={onRouteSearch}
                className="h-7 text-xs gap-1 border-morandi-gold/50 text-morandi-gold hover:bg-morandi-gold/10"
              >
                <List size="0.75em" />
                {COMP_EDITOR_LABELS.QUERYING_9229}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 多航段選擇器 */}
      {segments && segments.length > 0 && onSelectSegment && (
        <div className="bg-card p-3 rounded-lg border border-morandi-gold/30 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-morandi-secondary">
              {COMP_EDITOR_LABELS.PLEASE_SELECT_4482}
            </p>
            {onClearSegments && (
              <button
                type="button"
                onClick={onClearSegments}
                className="text-xs text-morandi-secondary hover:text-morandi-primary"
              >
                {COMP_EDITOR_LABELS.取消}
              </button>
            )}
          </div>
          <div className="space-y-1">
            {segments.map((seg, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSelectSegment(seg)}
                className="w-full text-left p-2 rounded border border-border hover:border-morandi-gold hover:bg-morandi-gold/5 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-morandi-primary">
                    {seg.departureAirport} → {seg.arrivalAirport}
                  </span>
                  <span className="text-xs text-morandi-secondary">
                    {seg.departureTime} - {seg.arrivalTime}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-2">
        <div>
          <label className="block text-[0.625rem] font-medium text-morandi-primary mb-0.5">
            {COMP_EDITOR_LABELS.LABEL_7827}
          </label>
          <Input
            type="text"
            value={flightData.airline || ''}
            onChange={e => onFieldChange('airline', e.target.value)}
            className="text-xs h-8"
            placeholder={COMP_EDITOR_LABELS.長榮航空}
          />
        </div>
        <div>
          <label className="block text-[0.625rem] font-medium text-morandi-primary mb-0.5">
            {COMP_EDITOR_LABELS.LABEL_8457}
          </label>
          <Input
            type="text"
            value={flightData.flightNumber || ''}
            onChange={e => onFieldChange('flightNumber', e.target.value)}
            className="text-xs h-8"
            placeholder="BR158"
          />
        </div>
        <div>
          <label className="block text-[0.625rem] font-medium text-morandi-primary mb-0.5">
            {COMP_EDITOR_LABELS.LABEL_6415}
          </label>
          <Input
            type="text"
            value={flightData.departureDate || ''}
            onChange={e => onFieldChange('departureDate', e.target.value)}
            className="text-xs h-8"
            placeholder="02/19"
            enableMathCalculation={false}
          />
        </div>
        <div>
          <label className="block text-[0.625rem] font-medium text-morandi-primary mb-0.5">
            {COMP_EDITOR_LABELS.LABEL_7552}
          </label>
          <Input
            type="text"
            value={flightData.duration || ''}
            onChange={e => onFieldChange('duration', e.target.value)}
            className="text-xs h-8"
            placeholder="2h 30m"
          />
        </div>
        <div>
          <label className="block text-[0.625rem] font-medium text-morandi-primary mb-0.5">
            {COMP_EDITOR_LABELS.LABEL_7410}
          </label>
          <Input
            type="text"
            value={flightData.departureAirport || ''}
            onChange={e => onFieldChange('departureAirport', e.target.value)}
            className="text-xs h-8"
            placeholder="TPE"
          />
        </div>
        <div>
          <label className="block text-[0.625rem] font-medium text-morandi-primary mb-0.5">
            {COMP_EDITOR_LABELS.LABEL_5706}
          </label>
          <Input
            type="text"
            value={flightData.departureTime || ''}
            onChange={e => onFieldChange('departureTime', e.target.value)}
            className="text-xs h-8"
            placeholder="06:50"
          />
        </div>
        <div>
          <label className="block text-[0.625rem] font-medium text-morandi-primary mb-0.5">
            {COMP_EDITOR_LABELS.LABEL_1689}
          </label>
          <Input
            type="text"
            value={flightData.arrivalAirport || ''}
            onChange={e => onFieldChange('arrivalAirport', e.target.value)}
            className="text-xs h-8"
            placeholder="KMQ"
          />
        </div>
        <div>
          <label className="block text-[0.625rem] font-medium text-morandi-primary mb-0.5">
            {COMP_EDITOR_LABELS.LABEL_749}
          </label>
          <Input
            type="text"
            value={flightData.arrivalTime || ''}
            onChange={e => onFieldChange('arrivalTime', e.target.value)}
            className="text-xs h-8"
            placeholder="09:55"
          />
        </div>
      </div>
    </div>
  )
}
