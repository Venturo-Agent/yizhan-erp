'use client'

import React, { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

import { useEnterSubmitWithShift } from '@/hooks/useEnterSubmit'
import { MessageSquare, Edit, X, Save } from 'lucide-react'
import { NotesSectionProps } from './types'
import { useAuthStore } from '@/stores/auth-store'
import { generateUUID } from '@/lib/utils/uuid'

export function NotesSection({ todo, onUpdate }: NotesSectionProps) {
  const t = useTranslations('todos')
  const [newNote, setNewNote] = useState('')
  const [editingNoteIndex, setEditingNoteIndex] = useState<number | null>(null)
  const [editingNoteContent, setEditingNoteContent] = useState('')
  const { user } = useAuthStore()

  // 進入備註區時，自動標記所有未讀留言為已讀
  useEffect(() => {
    if (!user?.id || !todo.notes?.length) return

    const unreadNotes = todo.notes.filter(
      note => note.author_id !== user.id && !note.read_by?.includes(user.id)
    )

    if (unreadNotes.length > 0) {
      const updatedNotes = todo.notes.map(note => {
        if (note.author_id !== user.id && !note.read_by?.includes(user.id)) {
          return {
            ...note,
            read_by: [...(note.read_by || []), user.id],
          }
        }
        return note
      })
      onUpdate({ notes: updatedNotes })
    }
  }, [todo.id])

  const addNote = () => {
    if (!newNote.trim() || !user) return

    const note = {
      id: generateUUID(),
      timestamp: new Date().toISOString(),
      content: newNote,
      author_id: user.id,
      author_name:
        user.display_name ||
        user.chinese_name ||
        user.english_name ||
        user.personal_info?.email ||
        t('unknownUser'),
      read_by: [user.id],
    }

    const updates: Partial<typeof todo> = {
      notes: [...(todo.notes || []), note],
    }

    if (todo.status === 'pending') {
      updates.status = 'in_progress'
    }

    onUpdate(updates)
    setNewNote('')
  }

  const { handleKeyDown: handleNoteKeyDown, compositionProps: noteCompositionProps } =
    useEnterSubmitWithShift(addNote)

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex-1 flex flex-col min-h-0">
      <h4 className="text-sm font-semibold text-morandi-primary mb-3 flex items-center gap-1.5">
        <MessageSquare size={14} className="text-morandi-gold" />
        {t('activityLog')}
      </h4>
      <div className="space-y-2 mb-3 max-h-[250px] overflow-y-auto">
        {(todo.notes || []).map((note, index) => (
          <div
            key={note.id || index}
            className="bg-gradient-to-br from-morandi-container/20 to-morandi-container/10 border border-morandi-container/30 rounded-lg p-3 hover:shadow-sm transition-shadow group relative"
          >
            {editingNoteIndex === index ? (
              // 編輯模式
              <div>
                <span className="text-xs text-morandi-muted font-medium">
                  {new Date(note.timestamp).toLocaleString()}
                </span>
                <Textarea
                  value={editingNoteContent}
                  onChange={e => setEditingNoteContent(e.target.value)}
                  className="text-xs mt-2 resize-none border-morandi-gold/20 focus-visible:ring-morandi-gold"
                  rows={3}
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      const newNotes = [...(todo.notes || [])]
                      newNotes[index] = { ...note, content: editingNoteContent }
                      onUpdate({ notes: newNotes })
                      setEditingNoteIndex(null)
                    }}
                    variant="soft-gold"
                    className="h-7 text-xs gap-1.5"
                  >
                    <Save size={12} />
                    {t('save')}
                  </Button>
                  <Button
                    size="sm"
                    variant="soft-gold"
                    onClick={() => setEditingNoteIndex(null)}
                    className="h-7 text-xs gap-1.5"
                  >
                    <X size={12} />
                    {t('cancel')}
                  </Button>
                </div>
              </div>
            ) : (
              // 顯示模式
              <>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button
                    onClick={() => {
                      setEditingNoteIndex(index)
                      setEditingNoteContent(note.content)
                    }}
                    className="p-1 hover:bg-morandi-gold/10 rounded text-morandi-secondary hover:text-morandi-gold"
                    title={t('editNote')}
                  >
                    <Edit size={12} />
                  </button>
                  <button
                    onClick={() => {
                      const newNotes = (todo.notes || []).filter((_, i) => i !== index)
                      onUpdate({ notes: newNotes })
                    }}
                    className="p-1 hover:bg-status-danger/10 rounded text-status-danger"
                    title={t('deleteNote')}
                  >
                    <X size={12} />
                  </button>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-morandi-primary">
                    {note.author_name || t('unknownUser')}
                  </span>
                  <span className="text-xs text-morandi-muted">
                    {new Date(note.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="text-xs text-morandi-primary leading-relaxed whitespace-pre-wrap mt-1">
                  {note.content}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <Textarea
        placeholder={t('addNote')}
        value={newNote}
        onChange={e => setNewNote(e.target.value)}
        onKeyDown={handleNoteKeyDown}
        {...noteCompositionProps}
        className="text-sm resize-none border-morandi-container/40 focus-visible:ring-morandi-gold focus-visible:border-morandi-gold shadow-sm"
        rows={3}
      />
    </div>
  )
}
