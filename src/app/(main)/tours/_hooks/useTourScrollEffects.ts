'use client'

import { useState, useEffect } from 'react'

interface ScrollEffectsOptions {
  viewMode: 'desktop' | 'mobile'
  isPreview: boolean
}

export function useTourScrollEffects({ viewMode, isPreview }: ScrollEffectsOptions) {
  const [scrollOpacity, setScrollOpacity] = useState(0)
  const [attractionsProgress, setAttractionsProgress] = useState(0)

  // 監聯滾動事件（同時支援 window 和父容器滾動）
  useEffect(() => {
    let scrollContainer: HTMLElement | null = null

    const handleContainerScroll = (e: Event) => {
      const target = e.target as HTMLElement
      const scrollTop = target.scrollTop
      const opacity = Math.min(scrollTop / 150, 1)
      setScrollOpacity(opacity)
    }

    const handleWindowScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      const opacity = Math.min(scrollTop / 150, 1)
      setScrollOpacity(opacity)
    }

    const findScrollableParent = (element: HTMLElement | null): HTMLElement | null => {
      if (!element) return null
      const parent = element.parentElement
      if (!parent) return null
      const overflowY = window.getComputedStyle(parent).overflowY
      if (overflowY === 'auto' || overflowY === 'scroll') {
        return parent
      }
      return findScrollableParent(parent)
    }

    // 先監聽 window 滾動（生產環境通常用這個）
    window.addEventListener('scroll', handleWindowScroll)
    // 立即執行一次以取得初始值
    handleWindowScroll()

    const timer = setTimeout(() => {
      const topElement = document.getElementById('top')
      if (topElement) {
        scrollContainer = findScrollableParent(topElement)
        if (scrollContainer) {
          // 如果有父容器滾動，也監聽它（預覽模式可能用這個）
          scrollContainer.addEventListener('scroll', handleContainerScroll)
        }
      }
    }, 100)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('scroll', handleWindowScroll)
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleContainerScroll)
      }
    }
  }, [])

  // 監聽精選景點區塊的滾動進度（手機版）
  useEffect(() => {
    if (viewMode !== 'mobile') {
      setAttractionsProgress(0) // 重置進度
      return
    }

    if (isPreview) {
      let progress = 0
      let isCancelled = false

      const interval = setInterval(() => {
        if (isCancelled) {
          clearInterval(interval)
          return
        }
        progress += 0.02
        if (progress >= 1) {
          progress = 1
          clearInterval(interval)
        }
        setAttractionsProgress(progress)
      }, 50)

      return () => {
        isCancelled = true
        clearInterval(interval)
      }
    }

    let scrollContainer: HTMLElement | null = null

    const handleScroll = () => {
      const attractionsElement = document.getElementById('attractions')
      if (!attractionsElement || !scrollContainer) return

      const rect = attractionsElement.getBoundingClientRect()
      const containerRect = scrollContainer.getBoundingClientRect()
      const elementTop = rect.top - containerRect.top
      const viewportHeight = containerRect.height
      const startPoint = viewportHeight * 0.8
      const endPoint = viewportHeight * 0.2
      const rawProgress = (startPoint - elementTop) / (startPoint - endPoint)
      const progress = Math.max(0, Math.min(1, rawProgress))
      setAttractionsProgress(progress)
    }

    const findScrollableParent = (element: HTMLElement | null): HTMLElement | null => {
      if (!element) return null
      const parent = element.parentElement
      if (!parent) return null
      const overflowY = window.getComputedStyle(parent).overflowY
      if (overflowY === 'auto' || overflowY === 'scroll') {
        return parent
      }
      return findScrollableParent(parent)
    }

    const timer = setTimeout(() => {
      const attractionsElement = document.getElementById('attractions')
      if (attractionsElement) {
        scrollContainer = findScrollableParent(attractionsElement)
        if (scrollContainer) {
          scrollContainer.addEventListener('scroll', handleScroll)
          handleScroll()
        }
      }
    }, 100)

    return () => {
      clearTimeout(timer)
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleScroll)
      }
    }
  }, [viewMode, isPreview])

  return {
    scrollOpacity,
    attractionsProgress,
  }
}
