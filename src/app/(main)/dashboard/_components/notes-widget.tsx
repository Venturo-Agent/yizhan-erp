'use client'

import { useState } from 'react'
import { Clipboard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import { useNotes } from '../_hooks'

const MAX_TABS = 5

export function NotesWidget() {
  const t = useTranslations('dashboard')
  const {
    tabs,
    updateContent,
    addTab: addTabHook,
    deleteTab: deleteTabHook,
    renameTab: renameTabHook,
  } = useNotes()
  const [activeTabId, setActiveTabId] = useState(tabs[0]?.id || '1')
  const [isEditingTab, setIsEditingTab] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  // 新增分頁
  const addTab = () => {
    if (tabs.length >= MAX_TABS) return
    addTabHook(MAX_TABS)
    // 設置新分頁為活動分頁
    setTimeout(() => {
      if (tabs.length < MAX_TABS) {
        const newTab = tabs[tabs.length]
        if (newTab) setActiveTabId(newTab.id)
      }
    }, 0)
  }

  // 刪除分頁
  const deleteTab = (tabId: string) => {
    if (tabs.length === 1) return
    deleteTabHook(tabId)
    if (activeTabId === tabId && tabs.length > 0) {
      setActiveTabId(tabs[0].id)
    }
  }

  // 重新命名分頁
  const renameTab = (tabId: string, newName: string) => {
    renameTabHook(tabId, newName)
    setIsEditingTab(null)
  }

  const activeTab = tabs.find(tab => tab.id === activeTabId) || tabs[0]

  return (
    <div className="h-full">
      <div className="h-full rounded-2xl border border-border/70 shadow-lg backdrop-blur-md transition-all duration-300 hover:shadow-lg hover:border-border/80 bg-gradient-to-br from-morandi-gold/10 via-card to-status-warning-bg flex flex-col">
        <div className="p-4 pb-3 flex-shrink-0">
          <div className="flex items-start gap-2">
            <div
              className={cn(
                'rounded-full p-2 text-white shadow-sm shadow-black/10',
                'bg-gradient-to-br from-morandi-gold/60 to-status-warning-bg/60',
                'ring-1 ring-border/50'
              )}
            >
              <Clipboard className="w-4 h-4 drop-shadow-sm" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-morandi-primary leading-tight tracking-wide">
                {t('label2502')}
              </p>
              <p className="text-xs text-morandi-secondary/90 mt-1 leading-relaxed">
                {t('label9180')}
              </p>
            </div>

            {/* 分頁標籤（右側橫排） */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {tabs.map(tab => (
                <div
                  key={tab.id}
                  className={cn(
                    'group relative flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer',
                    activeTabId === tab.id
                      ? 'bg-card/80 text-morandi-gold shadow-sm border border-border/60'
                      : 'bg-card/50 text-morandi-muted hover:bg-card/70 hover:text-morandi-primary border border-border/40'
                  )}
                >
                  {isEditingTab === tab.id ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                      onBlur={() => renameTab(tab.id, editingName)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') renameTab(tab.id, editingName)
                        if (e.key === 'Escape') setIsEditingTab(null)
                      }}
                      className="w-16 px-1 py-0.5 bg-card border border-morandi-gold/30 rounded-md outline-none text-xs"
                      autoFocus
                    />
                  ) : (
                    <span
                      onClick={() => setActiveTabId(tab.id)}
                      onDoubleClick={() => {
                        setIsEditingTab(tab.id)
                        setEditingName(tab.name)
                      }}
                      className="truncate max-w-[60px]"
                    >
                      {tab.name}
                    </span>
                  )}

                  {tabs.length > 1 && (
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        deleteTab(tab.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 text-morandi-muted hover:text-status-danger transition-opacity flex-shrink-0"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              ))}

              {tabs.length < MAX_TABS && (
                <button
                  onClick={addTab}
                  className="flex items-center justify-center p-1 rounded-md bg-card/50 border border-border/40 text-morandi-muted hover:bg-card/80 hover:text-morandi-gold hover:border-border/60 transition-all shadow-sm"
                  title={t('add5952')}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 pb-4 flex-1 flex flex-col min-h-0">
          <textarea
            value={activeTab.content}
            onChange={e => updateContent(activeTab.id, e.target.value)}
            className="w-full h-full p-4 border border-border/60 rounded-xl resize-none bg-card/90 hover:bg-card hover:border-border/80 hover:shadow-md focus:bg-card transition-all outline-none font-mono text-sm leading-relaxed shadow-sm backdrop-blur-sm"
            placeholder={t('label2922')}
          />
        </div>
      </div>
    </div>
  )
}
