'use client'

import { useState, useEffect, useCallback } from 'react'
import type { NoteTab } from '../_types'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { deleteUserNotes, insertNotes } from '@/app/(main)/dashboard/_services/dashboard.service'

const STORAGE_KEY = 'homepage-notes-tabs'
const DEFAULT_TABS: NoteTab[] = [{ id: '1', name: '筆記', content: '' }]

export function useNotes() {
  const [tabs, setTabs] = useState<NoteTab[]>(DEFAULT_TABS)
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuthStore()

  // 從 Supabase 載入筆記
  useEffect(() => {
    async function loadNotes() {
      if (typeof window === 'undefined' || !user?.id) {
        // 沒有登入用戶時，使用 localStorage
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          setTabs(JSON.parse(saved))
        }
        setIsLoading(false)
        return
      }

      try {
        // 從 Supabase 讀取用戶筆記
        const { data, error } = await supabase
          .from('notes')
          .select(
            'id, content, tab_id, tab_name, tab_order, user_id, created_by, workspace_id, created_at, updated_at, updated_by'
          )
          .eq('user_id', user.id)
          .order('tab_order', { ascending: true })
          .limit(500)

        if (error) {
          // Failed to load from Supabase - fallback to localStorage
          const saved = localStorage.getItem(STORAGE_KEY)
          if (saved) {
            setTabs(JSON.parse(saved))
          }
        } else if (data && data.length > 0) {
          const loadedTabs: NoteTab[] = data.map(note => ({
            id: note.tab_id,
            name: note.tab_name,
            content: note.content,
          }))
          setTabs(loadedTabs)
          // 同步到 localStorage 作為備份
          localStorage.setItem(STORAGE_KEY, JSON.stringify(loadedTabs))
        }
      } catch {
        // Error loading notes - fallback to localStorage
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          setTabs(JSON.parse(saved))
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadNotes()
  }, [user?.id])

  // 儲存到 Supabase 和 localStorage
  const saveTabs = useCallback(
    async (newTabs: NoteTab[]) => {
      setTabs(newTabs)

      // 總是保存到 localStorage 作為備份
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newTabs))
      }

      // 如果有登入用戶，保存到 Supabase
      if (user?.id) {
        try {
          // 先刪除所有現有筆記（簡單的同步策略）
          await deleteUserNotes(user.id)

          // 插入所有新筆記
          const notesToInsert = newTabs.map((tab, index) => ({
            user_id: user.id,
            workspace_id: user.workspace_id,
            tab_id: tab.id,
            tab_name: tab.name,
            content: tab.content,
            tab_order: index,
          }))

          await insertNotes(notesToInsert)
        } catch {
          // Error saving notes to Supabase
        }
      }
    },
    [user?.id]
  )

  // 更新內容
  const updateContent = useCallback(
    (tabId: string, content: string) => {
      setTabs(prevTabs => {
        const newTabs = prevTabs.map(tab => (tab.id === tabId ? { ...tab, content } : tab))
        // 使用 debounce 或直接保存（這裡直接保存）
        saveTabs(newTabs)
        return newTabs
      })
    },
    [saveTabs]
  )

  // 新增分頁
  const addTab = useCallback(
    (maxTabs: number = 5) => {
      setTabs(prevTabs => {
        if (prevTabs.length >= maxTabs) return prevTabs

        const newTab: NoteTab = {
          id: Date.now().toString(),
          name: `筆記 ${prevTabs.length + 1}`,
          content: '',
        }
        const newTabs = [...prevTabs, newTab]
        saveTabs(newTabs)
        return newTabs
      })
    },
    [saveTabs]
  )

  // 刪除分頁
  const deleteTab = useCallback(
    (tabId: string) => {
      setTabs(prevTabs => {
        if (prevTabs.length === 1) return prevTabs // 至少保留一個

        const newTabs = prevTabs.filter(tab => tab.id !== tabId)
        saveTabs(newTabs)
        return newTabs
      })
    },
    [saveTabs]
  )

  // 重新命名分頁
  const renameTab = useCallback(
    (tabId: string, newName: string) => {
      setTabs(prevTabs => {
        const newTabs = prevTabs.map(tab =>
          tab.id === tabId ? { ...tab, name: newName.trim() || tab.name } : tab
        )
        saveTabs(newTabs)
        return newTabs
      })
    },
    [saveTabs]
  )

  return {
    tabs,
    isLoading,
    updateContent,
    addTab,
    deleteTab,
    renameTab,
  }
}
