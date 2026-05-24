'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, X, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

/**
 * 通用的 Combobox 選項類型
 * @template T - 可選的額外資料類型
 */
export interface ComboboxOption<T = unknown> {
  /** 選項的唯一識別值 */
  value: string
  /** 顯示的標籤文字 */
  label: string
  /** 可選的額外資料，用於傳遞更多資訊 */
  data?: T
  /** 是否禁用此選項 */
  disabled?: boolean
}

/**
 * Combobox 組件的屬性
 * @template T - 選項額外資料的類型
 */
interface ComboboxProps<T = unknown> {
  /** 當前選中的值 */
  value: string
  /** 值改變時的回調函數 */
  onChange: (value: string) => void
  /** 選項被選中時的回調函數，可獲取完整的選項物件 */
  onSelect?: (option: ComboboxOption<T>) => void
  /** 可選項列表 */
  options: ComboboxOption<T>[]
  /** 輸入框佔位符 */
  placeholder?: string
  /** 自定義樣式類名 */
  className?: string
  /** 無搜尋結果時顯示的訊息 */
  emptyMessage?: string
  /** 是否顯示搜尋圖示 */
  showSearchIcon?: boolean
  /** 是否顯示清除按鈕 */
  showClearButton?: boolean
  /** 是否禁用整個組件 */
  disabled?: boolean
  /** 自定義選項渲染函數 */
  renderOption?: (option: ComboboxOption<T>) => React.ReactNode
  /** 下拉選單最大高度 */
  maxHeight?: string
  /** 禁用 Portal，讓下拉選單在原位置渲染（用於 Dialog 內） */
  disablePortal?: boolean
  /** 快速新增回調 — 傳入搜尋文字，回傳新建的 value（或 null 取消） */
  onCreate?: (name: string) => Promise<string | null>
  /** 快速新增按鈕文字，預設「+ 新增 "xxx"」 */
  createLabel?: string
  /** 掛載時自動展開下拉並聚焦（用於「點按鈕才出現」的欄位、省去再點一次） */
  defaultOpen?: boolean
}

/**
 * 可搜尋的下拉選單組件（Combobox/Autocomplete）
 *
 * 功能特點：
 * - 支援輸入搜尋/篩選選項
 * - 鍵盤導航（上下方向鍵、Enter、Escape）
 * - 清除按鈕
 * - 無結果提示
 * - 靈活的資料類型支援
 * - 莫蘭迪配色風格
 *
 * @example
 * ```tsx
 * const options = [
 *   { value: '1', label: '台北' },
 *   { value: '2', label: '台中' },
 *   { value: '3', label: '高雄' }
 * ];
 *
 * <Combobox
 *   value={selectedCity}
 *   onChange={setSelectedCity}
 *   options={options}
 *   placeholder="選擇城市"
 *   showClearButton
 * />
 * ```
 */
export function Combobox<T = unknown>({
  value,
  onChange,
  onSelect,
  options,
  placeholder = '輸入或選擇項目',
  className,
  emptyMessage = '無符合的選項',
  showSearchIcon = true,
  showClearButton = true,
  disabled = false,
  renderOption,
  maxHeight = '16rem',
  disablePortal = false,
  onCreate,
  createLabel,
  defaultOpen = false,
}: ComboboxProps<T>) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)
  const [searchValue, setSearchValue] = React.useState('')
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1)
  const [isCreating, setIsCreating] = React.useState(false)
  const [dropdownPosition, setDropdownPosition] = React.useState({
    top: 0,
    left: 0,
    width: 0,
    maxHeight: 256,
  })
  const inputRef = React.useRef<HTMLInputElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const dropdownRef = React.useRef<HTMLDivElement>(null)
  const optionRefs = React.useRef<(HTMLButtonElement | null)[]>([])

  // defaultOpen：掛載時聚焦輸入框（isOpen 已初始化為 true、位置計算 effect 會在 isOpen 變化時跑）
  React.useEffect(() => {
    if (defaultOpen && !disabled) {
      inputRef.current?.focus()
    }
    // 只在掛載時跑一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 當 value 或 options 改變時，更新搜尋值為對應的 label
  // 如果找不到匹配的 option，顯示空字串避免顯示原始 ID 或亂碼
  React.useEffect(() => {
    // 如果 value 為空，強制清空 searchValue
    if (!value) {
      setSearchValue('')
      return
    }

    const selectedOption = options.find(opt => opt.value === value)
    // 只顯示找到的 option 的 label，找不到時顯示空字串
    // 這樣可以避免顯示原始 ID、UUID 或其他不應該顯示的資料
    const newLabel = selectedOption?.label || ''
    // 只在 label 真的改變時才更新，避免不必要的 re-render
    setSearchValue(prev => (prev !== newLabel ? newLabel : prev))
  }, [value, options]) // 加回 options 依賴，確保 options 變化時能正確更新

  // 篩選選項
  const filteredOptions = React.useMemo(() => {
    return options.filter(option => {
      const label = typeof option.label === 'string' ? option.label : String(option.label ?? '')
      return label.toLowerCase().includes(searchValue.toLowerCase())
    })
  }, [options, searchValue])

  // 處理輸入變化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setSearchValue(newValue)

    // 只有在真正輸入內容時才打開下拉選單
    if (!isOpen) {
      setIsOpen(true)
    }

    setHighlightedIndex(-1)

    // 如果輸入為空，清除選擇
    if (!newValue) {
      onChange('')
    }
  }

  // 處理輸入框點擊（打開下拉選單）
  const handleInputClick = () => {
    if (!disabled && !isOpen) {
      setIsOpen(true)
    }
  }

  // 處理選項選擇
  const handleOptionSelect = (option: ComboboxOption<T>) => {
    if (option.disabled) return

    setSearchValue(option.label)
    onChange(option.value)
    onSelect?.(option)
    setIsOpen(false)
    setHighlightedIndex(-1)
  }

  // 清除選擇
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSearchValue('')
    onChange('')
    setIsOpen(false)
    inputRef.current?.focus()
  }

  // 切換下拉選單
  const handleToggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!disabled) {
      setIsOpen(!isOpen)
      if (!isOpen) {
        inputRef.current?.focus()
      }
    }
  }

  // 鍵盤導航
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true)
        setHighlightedIndex(0)
        e.preventDefault()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0))
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleOptionSelect(filteredOptions[highlightedIndex])
        } else if (
          onCreate &&
          searchValue.trim() &&
          !isCreating &&
          !options.some(o => o.label === searchValue.trim())
        ) {
          setIsCreating(true)
          onCreate(searchValue.trim())
            .then(newId => {
              if (newId) {
                onChange(newId)
                setIsOpen(false)
              }
            })
            .finally(() => setIsCreating(false))
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        setHighlightedIndex(-1)
        inputRef.current?.blur()
        break
      case 'Tab':
        setIsOpen(false)
        break
    }
  }

  // 滾動到高亮的選項
  React.useEffect(() => {
    if (highlightedIndex >= 0 && optionRefs.current[highlightedIndex]) {
      optionRefs.current[highlightedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      })
    }
  }, [highlightedIndex])

  // 點擊外部關閉下拉選單
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 計算下拉選單位置（使用 Portal 時需要）
  React.useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const dropdownMaxHeight = parseInt(maxHeight) * 16 || 256 // 16rem = 256px
      const spaceBelow = viewportHeight - rect.bottom
      const spaceAbove = rect.top

      // 如果下方空間不足，且上方空間更大，則顯示在上方
      const showAbove = spaceBelow < dropdownMaxHeight && spaceAbove > spaceBelow

      setDropdownPosition({
        top: showAbove
          ? rect.top + window.scrollY - Math.min(dropdownMaxHeight, spaceAbove - 8) - 4
          : rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
        maxHeight: showAbove
          ? Math.min(dropdownMaxHeight, spaceAbove - 8)
          : Math.min(dropdownMaxHeight, spaceBelow - 8),
      })
    }
  }, [isOpen])

  // 預設選項渲染
  const defaultRenderOption = (option: ComboboxOption<T>) => (
    <span className="text-morandi-primary">{option.label}</span>
  )

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* 輸入框 */}
      <div className="relative">
        {showSearchIcon && (
          <Search
            size="1em"
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-morandi-secondary pointer-events-none"
          />
        )}
        <Input
          ref={inputRef}
          type="text"
          value={searchValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onClick={handleInputClick}
          placeholder={placeholder}
          disabled={disabled}
          className={cn('pr-8 transition-all', showSearchIcon ? '!pl-10' : 'pl-3')}
        />
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {showClearButton && searchValue && !disabled && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-6 w-6 p-0 hover:bg-morandi-container/50"
            >
              <X size="0.875em" className="text-morandi-secondary" />
            </Button>
          )}
          <button
            type="button"
            onClick={handleToggleDropdown}
            className="h-6 w-6 flex items-center justify-center hover:bg-morandi-container/50 rounded transition-colors"
            disabled={disabled}
          >
            <ChevronDown
              size="1em"
              className={cn(
                'text-morandi-secondary transition-transform',
                isOpen && 'transform rotate-180'
              )}
            />
          </button>
        </div>
      </div>

      {/* 下拉選單 */}
      {isOpen &&
        !disabled &&
        (() => {
          const dropdownContent = (
            <div
              ref={dropdownRef}
              role="listbox"
              className={cn(
                'bg-card border border-border rounded-lg shadow-lg overflow-hidden',
                disablePortal ? 'absolute left-0 right-0 top-full mt-1 z-[9999]' : 'fixed z-[10010]'
              )}
              style={
                disablePortal
                  ? { maxHeight }
                  : {
                      top: dropdownPosition.top,
                      left: dropdownPosition.left,
                      width: dropdownPosition.width,
                      maxHeight: dropdownPosition.maxHeight,
                      pointerEvents: 'auto',
                    }
              }
              onMouseDown={e => e.stopPropagation()}
              onPointerDown={e => e.stopPropagation()}
              onClick={e => e.stopPropagation()}
            >
              <div
                className="overflow-y-auto overscroll-contain"
                style={{
                  maxHeight: disablePortal ? maxHeight : dropdownPosition.maxHeight,
                  WebkitOverflowScrolling: 'touch',
                  touchAction: 'pan-y',
                }}
                onWheel={e => {
                  // 5/13：portal dropdown 的 wheel event 經 React 樹冒泡會被外層 EnhancedTable
                  // scroll container 攔截、改用手動 scrollTop 維持流暢滾動
                  e.stopPropagation()
                  const target = e.currentTarget
                  target.scrollTop += e.deltaY
                }}
              >
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((option, index) => (
                    <button
                      key={`${option.value}-${index}`}
                      ref={el => {
                        optionRefs.current[index] = el
                      }}
                      type="button"
                      onClick={() => handleOptionSelect(option)}
                      disabled={option.disabled}
                      className={cn(
                        'w-full px-3 py-2 text-left text-sm transition-colors touch-manipulation',
                        'hover:bg-morandi-container/30 focus:bg-morandi-container/30 focus:outline-none',
                        highlightedIndex === index && 'bg-morandi-container/50',
                        option.value === value && 'bg-morandi-gold/10 font-medium',
                        option.disabled && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      {renderOption ? renderOption(option) : defaultRenderOption(option)}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-6 text-center text-sm text-morandi-secondary">
                    {emptyMessage}
                  </div>
                )}
                {onCreate &&
                  searchValue.trim() &&
                  !options.some(o => o.label === searchValue.trim()) && (
                    <button
                      type="button"
                      disabled={isCreating}
                      onClick={async () => {
                        if (isCreating) return
                        setIsCreating(true)
                        setIsOpen(false)
                        try {
                          const newId = await onCreate(searchValue.trim())
                          if (newId) {
                            onChange(newId)
                          }
                        } finally {
                          setIsCreating(false)
                        }
                      }}
                      className={cn(
                        'w-full px-3 py-2 text-left text-sm text-morandi-gold hover:bg-morandi-gold/10 border-t border-border transition-colors',
                        isCreating && 'opacity-50 cursor-wait'
                      )}
                    >
                      {isCreating ? '建立中...' : createLabel || `+ 新增「${searchValue.trim()}」`}
                    </button>
                  )}
              </div>
            </div>
          )

          // 使用 Portal 或直接渲染
          if (disablePortal) {
            return dropdownContent
          }
          return typeof document !== 'undefined'
            ? createPortal(dropdownContent, document.body)
            : null
        })()}
    </div>
  )
}
