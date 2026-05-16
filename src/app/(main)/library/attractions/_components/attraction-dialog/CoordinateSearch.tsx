'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { MapPin, ExternalLink } from 'lucide-react'

const COMPONENT_LABELS = {
  ERR_PARSE_URL: '無法解析座標，請確認連結格式',
  ERR_PARSE_FORMAT: '格式錯誤，請輸入「緯度, 經度」（例如：12.9483, 100.8898）',
  ERR_RANGE: '座標超出範圍',
  ERR_INVALID: '請輸入有效的座標數值',
  CURRENT_PREFIX: '目前：',
  MAP_CONFIRM: '地圖確認',
  PASTE_COORDS_HINT: '貼上座標（格式：緯度, 經度）',
  PASTE_COORDS_PLACEHOLDER: '例如：12.948332, 100.889793',
  APPLY: '套用',
  PASTE_GMAP_HINT: '貼上 Google Maps 連結自動解析座標',
  PARSE: '解析',
  MANUAL_HINT: '或手動輸入座標',
  LAT_PLACEHOLDER: '緯度（如 18.7883）',
  LNG_PLACEHOLDER: '經度（如 98.9853）',
  TIP: '提示：在 Google Maps 找到景點後，點「分享」複製連結，或直接複製網址列的 URL',
} as const

interface CoordinateSearchProps {
  attractionName: string
  city?: string
  country?: string
  currentLat?: number
  currentLng?: number
  onCoordsUpdate: (lat: number, lng: number, address?: string) => void
  readOnly?: boolean
}

/**
 * 座標輸入工具
 * 支援：
 * 1. 手動輸入 lat/lng
 * 2. 貼上 Google Maps 連結自動解析
 */
export function CoordinateSearch({
  attractionName: _attractionName,
  currentLat,
  currentLng,
  onCoordsUpdate,
  readOnly = false,
}: CoordinateSearchProps) {
  const [googleMapsUrl, setGoogleMapsUrl] = useState('')
  const [urlError, setUrlError] = useState('')
  const [manualLat, setManualLat] = useState('')
  const [manualLng, setManualLng] = useState('')
  const [coordsPaste, setCoordsPaste] = useState('')

  // 從 Google Maps URL 解析座標
  const parseGoogleMapsUrl = (url: string): { lat: number; lng: number } | null => {
    try {
      // 格式: @lat,lng,zoom
      const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/)
      if (atMatch) {
        return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) }
      }
      // 格式: /maps/place/...!3dlat!4dlng
      const d3Match = url.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/)
      if (d3Match) {
        return { lat: parseFloat(d3Match[1]), lng: parseFloat(d3Match[2]) }
      }
      // 格式: ll=lat,lng
      const llMatch = url.match(/ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/)
      if (llMatch) {
        return { lat: parseFloat(llMatch[1]), lng: parseFloat(llMatch[2]) }
      }
      return null
    } catch {
      return null
    }
  }

  const handleUrlPaste = () => {
    setUrlError('')
    const coords = parseGoogleMapsUrl(googleMapsUrl)
    if (coords) {
      onCoordsUpdate(coords.lat, coords.lng)
      setGoogleMapsUrl('')
    } else {
      setUrlError(COMPONENT_LABELS.ERR_PARSE_URL)
    }
  }

  // 解析貼上的「緯度, 經度」格式
  const handleCoordsPaste = () => {
    setUrlError('')
    const match = coordsPaste.trim().match(/^(-?\d+\.?\d*)\s*[,，]\s*(-?\d+\.?\d*)$/)
    if (!match) {
      setUrlError(COMPONENT_LABELS.ERR_PARSE_FORMAT)
      return
    }
    const lat = parseFloat(match[1])
    const lng = parseFloat(match[2])
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setUrlError(COMPONENT_LABELS.ERR_RANGE)
      return
    }
    onCoordsUpdate(lat, lng)
    setCoordsPaste('')
  }

  const handleManualInput = () => {
    const lat = parseFloat(manualLat)
    const lng = parseFloat(manualLng)
    if (isNaN(lat) || isNaN(lng)) {
      setUrlError(COMPONENT_LABELS.ERR_INVALID)
      return
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setUrlError(COMPONENT_LABELS.ERR_RANGE)
      return
    }
    setUrlError('')
    onCoordsUpdate(lat, lng)
    setManualLat('')
    setManualLng('')
  }

  if (readOnly) {
    if (!currentLat || !currentLng) return null
    return (
      <a
        href={`https://www.google.com/maps?q=${currentLat},${currentLng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-xs text-status-info hover:underline"
      >
        <MapPin size={12} />
        {currentLat.toFixed(6)}, {currentLng.toFixed(6)}
        <ExternalLink size={10} />
      </a>
    )
  }

  return (
    <div className="space-y-3">
      {/* 目前座標顯示 */}
      {currentLat && currentLng && (
        <div className="flex items-center gap-2 text-xs text-morandi-secondary">
          <MapPin size={12} className="text-morandi-gold" />
          <span>
            {COMPONENT_LABELS.CURRENT_PREFIX}{currentLat.toFixed(6)}, {currentLng.toFixed(6)}
          </span>
          <a
            href={`https://www.google.com/maps?q=${currentLat},${currentLng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-status-info hover:underline flex items-center gap-1"
          >
            {COMPONENT_LABELS.MAP_CONFIRM} <ExternalLink size={10} />
          </a>
        </div>
      )}

      {/* 貼上「緯度, 經度」座標 */}
      <div>
        <p className="text-xs text-morandi-secondary mb-1">{COMPONENT_LABELS.PASTE_COORDS_HINT}</p>
        <div className="flex gap-2">
          <Input
            value={coordsPaste}
            onChange={e => setCoordsPaste(e.target.value)}
            placeholder={COMPONENT_LABELS.PASTE_COORDS_PLACEHOLDER}
            className="text-xs"
            onKeyDown={e => e.key === 'Enter' && coordsPaste && handleCoordsPaste()}
          />
          <Button
            type="button"
            size="sm"
            variant="soft-gold"
            onClick={handleCoordsPaste}
            disabled={!coordsPaste}
          >
            {COMPONENT_LABELS.APPLY}
          </Button>
        </div>
      </div>

      {/* 貼上 Google Maps 連結 */}
      <div>
        <p className="text-xs text-morandi-secondary mb-1">{COMPONENT_LABELS.PASTE_GMAP_HINT}</p>
        <div className="flex gap-2">
          <Input
            value={googleMapsUrl}
            onChange={e => setGoogleMapsUrl(e.target.value)}
            placeholder="https://maps.google.com/..."
            className="text-xs"
          />
          <Button
            type="button"
            size="sm"
            variant="soft-gold"
            onClick={handleUrlPaste}
            disabled={!googleMapsUrl}
          >
            {COMPONENT_LABELS.PARSE}
          </Button>
        </div>
      </div>

      {/* 手動輸入 */}
      <div>
        <p className="text-xs text-morandi-secondary mb-1">{COMPONENT_LABELS.MANUAL_HINT}</p>
        <div className="flex gap-2">
          <Input
            value={manualLat}
            onChange={e => setManualLat(e.target.value)}
            placeholder={COMPONENT_LABELS.LAT_PLACEHOLDER}
            className="text-xs"
          />
          <Input
            value={manualLng}
            onChange={e => setManualLng(e.target.value)}
            placeholder={COMPONENT_LABELS.LNG_PLACEHOLDER}
            className="text-xs"
          />
          <Button
            type="button"
            size="sm"
            variant="soft-gold"
            onClick={handleManualInput}
            disabled={!manualLat || !manualLng}
          >
            {COMPONENT_LABELS.APPLY}
          </Button>
        </div>
      </div>

      {urlError && <p className="text-xs text-status-danger">{urlError}</p>}

      {/* 提示 */}
      <p className="text-xs text-morandi-muted">
        {COMPONENT_LABELS.TIP}
      </p>
    </div>
  )
}
