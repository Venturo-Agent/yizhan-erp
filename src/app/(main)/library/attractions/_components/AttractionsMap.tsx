'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { MapPin, Navigation } from 'lucide-react'
import type { Attraction } from '../_types'
import type L from 'leaflet'
import { logger } from '@/lib/utils/logger'

import { Spinner } from '@/components/ui/spinner'
interface AttractionsMapProps {
  attractions: Attraction[]
  selectedAttraction: Attraction | null
  radiusKm?: number
  onCenterChange?: (center: { latitude: number; longitude: number; zoom: number }) => void
}

// 計算兩點間距離
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Morandi 調色盤 — Leaflet 地圖標記需要實際 hex 值，無法使用 CSS 變數
const CATEGORY_COLORS: Record<string, string> = {
  神社寺廟: '#c08374', // morandi-red
  自然景觀: '#9fa68f', // morandi-green
  歷史古蹟: '#c9aa7c', // morandi-gold
  主題樂園: '#8b8680', // morandi-secondary
  美術館: '#8ba4b4', // status-info
  購物: '#d4a574', // status-warning
}
const CATEGORY_COLOR_DEFAULT = '#b8b2aa' // morandi-muted

function getCategoryColor(category?: string): string {
  return (category && CATEGORY_COLORS[category]) || CATEGORY_COLOR_DEFAULT
}

export function AttractionsMap({
  attractions,
  selectedAttraction,
  radiusKm = 5,
  onCenterChange,
}: AttractionsMapProps) {
  const t = useTranslations('library')
  const mapRef = useRef<L.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const markersLayerRef = useRef<L.LayerGroup | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [nearbyAttractions, setNearbyAttractions] = useState<Attraction[]>([])
  const initedRef = useRef(false)
  // 地圖中心（用於重新計算附近景點）
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null)

  // 篩選附近景點（根據地圖中心或選中景點）
  useEffect(() => {
    const centerLat = mapCenter?.lat ?? selectedAttraction?.latitude
    const centerLng = mapCenter?.lng ?? selectedAttraction?.longitude

    if (!centerLat || !centerLng) {
      setNearbyAttractions([])
      return
    }

    const nearby = attractions.filter(a => {
      if (!a.latitude || !a.longitude) return false
      const distance = calculateDistance(centerLat, centerLng, a.latitude, a.longitude)
      return distance <= radiusKm
    })

    setNearbyAttractions(nearby)
  }, [
    selectedAttraction?.id,
    selectedAttraction?.latitude,
    selectedAttraction?.longitude,
    attractions.length,
    radiusKm,
    mapCenter?.lat,
    mapCenter?.lng,
  ])

  // 初始化地圖
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    if (!selectedAttraction?.latitude || !selectedAttraction?.longitude) return

    // 防止重複初始化
    if (initedRef.current && mapRef.current) {
      mapRef.current.setView([selectedAttraction.latitude, selectedAttraction.longitude], 14)
      return
    }

    const initMap = async () => {
      setIsLoading(true)
      const L = (await import('leaflet')).default

      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }

      // 創建地圖 - 隱藏縮放控制，確保可拖曳
      const map = L.map(container, {
        center: [selectedAttraction.latitude!, selectedAttraction.longitude!],
        zoom: 12, // 縮小比例，顯示更大範圍
        zoomControl: false, // 隱藏縮放控制
        dragging: true,
        touchZoom: true,
        scrollWheelZoom: true,
        keyboard: true,
      })

      // CartoDB Positron 淺色底圖
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OSM © CARTO',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map)

      mapRef.current = map
      initedRef.current = true

      // 延遲刷新大小，確保地圖已渲染
      setTimeout(() => {
        if (mapRef.current && mapRef.current.getContainer()) {
          try {
            mapRef.current.invalidateSize()
          } catch (e) {
            logger.warn('地圖 invalidateSize 失敗:', e)
          }
        }
      }, 300)

      // 搜尋範圍圓圈（虛線）- 跟著地圖中心移動
      const searchCircle = L.circle([selectedAttraction.latitude!, selectedAttraction.longitude!], {
        radius: radiusKm * 1000,
        color: '#b8b2aa',
        fillColor: '#b8b2aa',
        fillOpacity: 0.08,
        weight: 2,
        dashArray: '8, 8',
      }).addTo(map)

      // 地圖移動時更新圓圈位置 + 重新計算附近景點
      let moveTimeout: ReturnType<typeof setTimeout> | null = null
      let saveTimeout: ReturnType<typeof setTimeout> | null = null

      map.on('moveend', () => {
        const center = map.getCenter()
        const zoom = map.getZoom()
        searchCircle.setLatLng(center)

        // 800ms 延遲更新附近景點（讓 popup 有時間顯示）
        if (moveTimeout) clearTimeout(moveTimeout)
        moveTimeout = setTimeout(() => {
          setMapCenter({ lat: center.lat, lng: center.lng })
        }, 800)

        // 5 秒 debounce 存 localStorage（減少寫入頻率）
        if (saveTimeout) clearTimeout(saveTimeout)
        saveTimeout = setTimeout(() => {
          onCenterChange?.({
            latitude: center.lat,
            longitude: center.lng,
            zoom,
          })
        }, 5000)
      })

      // 創建自訂標記（圓角方形 + 圖片）
      const createMarkerIcon = (attraction: Attraction, isMain: boolean) => {
        const color = isMain ? '#c08374' : getCategoryColor(attraction.category) // morandi-red for main marker
        const size = isMain ? 44 : 36
        const imgSize = isMain ? 36 : 28
        const img = attraction.images?.[0] || ''

        return L.divIcon({
          className: 'custom-attraction-marker',
          html: `
            <div style="
              width: ${size}px;
              height: ${size}px;
              background: ${color};
              border: 3px solid white;
              border-radius: 10px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.25);
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: hidden;
            ">
              ${
                img
                  ? `
                <img alt=""
                  src="${img}"
                  style="width: ${imgSize}px; height: ${imgSize}px; object-fit: cover; border-radius: 6px;"
                  onerror="this.style.display='none'"
                />
              `
                  : `
                <div style="
                  width: ${imgSize}px;
                  height: ${imgSize}px;
                  background: rgba(255,255,255,0.3);
                  border-radius: 6px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: white;
                  font-size: ${isMain ? 16 : 12}px;
                ">📍</div>
              `
              }
            </div>
          `,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        })
      }

      // 主景點標記
      const mainMarker = L.marker([selectedAttraction.latitude!, selectedAttraction.longitude!], {
        icon: createMarkerIcon(selectedAttraction, true),
      }).addTo(map)

      mainMarker.bindTooltip(selectedAttraction.name, {
        permanent: true,
        direction: 'top',
        offset: [0, -24],
        className: 'main-marker-tooltip',
      })

      // 創建 LayerGroup 存放附近景點 markers
      markersLayerRef.current = L.layerGroup().addTo(map)

      setIsLoading(false)
    }

    initMap().catch(err => logger.error('[initMap]', err))

    return () => {}
  }, [
    selectedAttraction?.id,
    selectedAttraction?.latitude,
    selectedAttraction?.longitude,
    radiusKm,
  ])

  // 更新附近景點 markers（當 nearbyAttractions 或 mapCenter 變化時）
  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current) return

    const updateMarkers = async () => {
      const L = (await import('leaflet')).default

      // 清除舊的 markers
      markersLayerRef.current?.clearLayers()

      // 計算中心點（用於計算距離）
      const centerLat = mapCenter?.lat ?? selectedAttraction?.latitude
      const centerLng = mapCenter?.lng ?? selectedAttraction?.longitude
      if (!centerLat || !centerLng) return

      // 創建 marker icon 函數
      const createMarkerIcon = (attraction: Attraction) => {
        const color = getCategoryColor(attraction.category)
        const size = 36
        const img = attraction.images?.[0] || ''

        return L.divIcon({
          className: 'custom-attraction-marker',
          html: `
            <div style="
              width: ${size}px;
              height: ${size}px;
              background: ${color};
              border: 3px solid white;
              border-radius: 10px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.25);
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: hidden;
              cursor: pointer;
              transition: transform 0.2s;
            ">
              ${img ? `<img src="${img}" style="width: 100%; height: 100%; object-fit: cover;" />` : '<div style="font-size: 16px;">📍</div>'}
            </div>
          `,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        })
      }

      // 新增附近景點 markers
      nearbyAttractions.slice(0, 20).forEach(attraction => {
        if (!attraction.latitude || !attraction.longitude) return

        const distance = calculateDistance(
          centerLat,
          centerLng,
          attraction.latitude,
          attraction.longitude
        ).toFixed(1)

        const marker = L.marker([attraction.latitude, attraction.longitude], {
          icon: createMarkerIcon(attraction),
        })

        marker.bindTooltip(attraction.name, {
          direction: 'top',
          offset: [0, -20],
          className: 'nearby-marker-tooltip',
        })

        marker.bindPopup(
          `
          <div style="min-width: 180px; padding: 4px;">
            ${attraction.images?.[0] ? `<img alt="" src="${attraction.images[0]}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;" />` : ''}
            <div style="font-weight: 600; font-size: 14px; color: #3a3633;">${attraction.name}</div>
            <div style="font-size: 12px; color: #8b8680; margin-top: 4px;">${attraction.category || ''} · ${distance} km</div>
            ${attraction.description ? `<div style="font-size: 11px; color: #b8b2aa; margin-top: 6px; line-height: 1.4;">${attraction.description.slice(0, 80)}${attraction.description.length > 80 ? '...' : ''}</div>` : ''}
          </div>
        `,
          { closeButton: true, className: 'attraction-popup' }
        )

        markersLayerRef.current?.addLayer(marker)
      })
    }

    updateMarkers()
  }, [
    JSON.stringify(nearbyAttractions.map(a => a.id)),
    mapCenter?.lat,
    mapCenter?.lng,
    selectedAttraction?.latitude,
    selectedAttraction?.longitude,
  ])

  // 組件卸載時清理
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        initedRef.current = false
      }
    }
  }, [])

  if (!selectedAttraction) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted text-morandi-secondary">
        <MapPin size={40} className="mb-3 opacity-40" />
        <p className="text-sm">{t('attractionsMapSelect')}</p>
      </div>
    )
  }

  if (!selectedAttraction.latitude || !selectedAttraction.longitude) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted text-morandi-secondary">
        <Navigation size={40} className="mb-3 opacity-40" />
        <p className="text-sm">{t('attractionsMapEmpty')}</p>
      </div>
    )
  }

  return (
    <div className="absolute inset-0">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/80 z-[2000]">
          <Spinner size="lg" className="text-morandi-secondary" />
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" style={{ minHeight: '400px' }} />
    </div>
  )
}
