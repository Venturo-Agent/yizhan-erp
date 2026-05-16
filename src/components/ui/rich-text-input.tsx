'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
import FontFamily from '@tiptap/extension-font-family'
import { useEffect, useCallback, useState, useRef, useMemo } from 'react'
import { cn } from '@/lib/utils'

const COMPONENT_LABELS = {
  FONT: '字體',
} as const
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Palette,
  Highlighter,
  Type,
} from 'lucide-react'
import { UI_LABELS } from './constants/labels'
import { sanitizeHtml } from '@/lib/utils/sanitize'

interface RichTextInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  singleLine?: boolean
}

// 預設顏色選項
const COLORS = [
  { label: '深棕灰', value: '#3a3633' },
  { label: '白色', value: '#FFFFFF' },
  { label: '紅色', value: '#E53935' },
  { label: '橙色', value: '#FB8C00' },
  { label: '黃色', value: '#FDD835' },
  { label: '綠色', value: '#43A047' },
  { label: '藍色', value: '#1E88E5' },
  { label: '紫色', value: '#8E24AA' },
  { label: '粉色', value: '#EC407A' },
  { label: '金色', value: '#C69C6D' },
  { label: '深綠', value: '#2C5F4D' },
  { label: '日本藍', value: '#30abe8' },
]

// 螢光色選項
const HIGHLIGHTS = [
  { label: '黃色', value: '#FFEB3B' },
  { label: '綠色', value: '#C8E6C9' },
  { label: '藍色', value: '#BBDEFB' },
  { label: '粉色', value: '#F8BBD9' },
  { label: '橙色', value: '#FFE0B2' },
]

// 字體選項（使用已載入的 Google Fonts）
const FONTS = [
  { label: '預設', value: '' },
  // 中文
  { label: 'Noto Serif TC（宋體）', value: '"Noto Serif TC", serif' },
  { label: 'LXGW WenKai TC（手寫楷）', value: '"LXGW WenKai TC", cursive' },
  { label: 'Zen Old Mincho（日系宋）', value: '"Zen Old Mincho", serif' },
  // 英文無襯線
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Montserrat', value: 'Montserrat, sans-serif' },
  { label: 'Poppins', value: 'Poppins, sans-serif' },
  { label: 'Quicksand', value: 'Quicksand, sans-serif' },
  // 英文有襯線
  { label: 'Playfair Display', value: '"Playfair Display", serif' },
  { label: 'Cormorant Garamond', value: '"Cormorant Garamond", serif' },
  // 英文手寫
  { label: 'Dancing Script', value: '"Dancing Script", cursive' },
  { label: 'Great Vibes', value: '"Great Vibes", cursive' },
  { label: 'Caveat', value: 'Caveat, cursive' },
]

export function RichTextInput({
  value,
  onChange,
  placeholder,
  className,
  singleLine = true,
}: RichTextInputProps) {
  const [showToolbar, setShowToolbar] = useState(false)
  const [toolbarPos, setToolbarPos] = useState({ top: 0, left: 0 })
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showHighlightPicker, setShowHighlightPicker] = useState(false)
  const [showFontPicker, setShowFontPicker] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Memoize extensions to prevent recreating on each render
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        // 允許 hardBreak（Shift+Enter）
        hardBreak: singleLine ? false : undefined,
      }),
      TextStyle,
      Color,
      FontFamily,
      Underline.configure({
        HTMLAttributes: {
          class: 'underline',
        },
      }),
      Highlight.configure({ multicolor: true }),
    ],
    [singleLine]
  )

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: value || '',
    editorProps: {
      attributes: {
        class: cn(
          'focus:outline-none min-h-[2.5rem] px-3 py-2',
          singleLine && 'whitespace-nowrap overflow-x-auto'
        ),
      },
      handleKeyDown: (view, event) => {
        if (singleLine) {
          // Enter 禁止，Shift+Enter 也禁止（單行模式）
          if (event.key === 'Enter') {
            event.preventDefault()
            return true
          }
        } else {
          // 多行模式：Shift+Enter 插入 hardBreak
          if (event.key === 'Enter' && event.shiftKey) {
            editor?.chain().focus().setHardBreak().run()
            event.preventDefault()
            return true
          }
        }
        return false
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      if (html === '<p></p>' || html === '') {
        onChange('')
      } else {
        onChange(html)
      }
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection
      if (from !== to) {
        const selection = window.getSelection()
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0)
          const rect = range.getBoundingClientRect()
          const containerRect = containerRef.current?.getBoundingClientRect()
          if (containerRect) {
            setToolbarPos({
              top: rect.top - containerRect.top - 45,
              left: rect.left - containerRect.left + rect.width / 2 - 150,
            })
          }
        }
        setShowToolbar(true)
      } else {
        setShowToolbar(false)
        setShowColorPicker(false)
        setShowHighlightPicker(false)
        setShowFontPicker(false)
      }
    },
  })

  // 同步外部值變化
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '')
    }
  }, [value, editor])

  const setColor = useCallback(
    (color: string) => {
      editor?.chain().focus().setColor(color).run()
      setShowColorPicker(false)
    },
    [editor]
  )

  const setHighlight = useCallback(
    (color: string) => {
      editor?.chain().focus().toggleHighlight({ color }).run()
      setShowHighlightPicker(false)
    },
    [editor]
  )

  const removeHighlight = useCallback(() => {
    editor?.chain().focus().unsetHighlight().run()
    setShowHighlightPicker(false)
  }, [editor])

  const setFont = useCallback(
    (fontFamily: string) => {
      if (fontFamily === '') {
        editor?.chain().focus().unsetFontFamily().run()
      } else {
        editor?.chain().focus().setFontFamily(fontFamily).run()
      }
      setShowFontPicker(false)
    },
    [editor]
  )

  if (!editor) return null

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative border border-input rounded-md bg-card',
        'focus-within:ring-2 focus-within:ring-morandi-gold/20 focus-within:border-morandi-gold',
        className
      )}
    >
      {/* 浮動工具列 */}
      {showToolbar && (
        <div
          className="absolute z-50 flex items-center gap-0.5 bg-card rounded-lg shadow-lg border border-border p-1"
          style={{
            top: Math.max(toolbarPos.top, -45),
            left: Math.max(toolbarPos.left, 0),
          }}
          onMouseDown={e => e.preventDefault()}
        >
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn(
              'p-1.5 rounded hover:bg-muted transition-colors',
              editor.isActive('bold') && 'bg-muted'
            )}
            title={UI_LABELS.LABEL_3889}
          >
            <Bold size="1em" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={cn(
              'p-1.5 rounded hover:bg-muted transition-colors',
              editor.isActive('italic') && 'bg-muted'
            )}
            title={UI_LABELS.LABEL_9678}
          >
            <Italic size="1em" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={cn(
              'p-1.5 rounded hover:bg-muted transition-colors',
              editor.isActive('underline') && 'bg-muted'
            )}
            title={UI_LABELS.LABEL_5500}
          >
            <UnderlineIcon size="1em" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={cn(
              'p-1.5 rounded hover:bg-muted transition-colors',
              editor.isActive('strike') && 'bg-muted'
            )}
            title={UI_LABELS.DELETE_5630}
          >
            <Strikethrough size="1em" />
          </button>

          <div className="w-px h-5 bg-muted mx-1" />

          {/* 字體選擇 */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowFontPicker(!showFontPicker)
                setShowColorPicker(false)
                setShowHighlightPicker(false)
              }}
              className="p-1.5 rounded hover:bg-muted transition-colors"
              title={COMPONENT_LABELS.FONT}
            >
              <Type size="1em" />
            </button>
            {showFontPicker && (
              <div className="absolute left-0 top-full mt-1 bg-card rounded-lg shadow-lg border border-border z-50 min-w-[12.5rem] max-h-[17.5rem] overflow-y-auto">
                {FONTS.map(font => (
                  <button
                    key={font.value}
                    type="button"
                    onClick={() => setFont(font.value)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2"
                    style={{ fontFamily: font.value || 'inherit' }}
                  >
                    {font.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 文字顏色 */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowColorPicker(!showColorPicker)
                setShowHighlightPicker(false)
                setShowFontPicker(false)
              }}
              className="p-1.5 rounded hover:bg-muted transition-colors"
              title={UI_LABELS.LABEL_4467}
            >
              <Palette size="1em" />
            </button>
            {showColorPicker && (
              <div className="absolute left-0 top-full mt-1 grid grid-cols-4 gap-1 p-2 bg-card rounded-lg shadow-lg border border-border z-50 min-w-[8.75rem]">
                {COLORS.map(color => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setColor(color.value)}
                    className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 螢光標記 */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowHighlightPicker(!showHighlightPicker)
                setShowColorPicker(false)
                setShowFontPicker(false)
              }}
              className={cn(
                'p-1.5 rounded hover:bg-muted transition-colors',
                editor.isActive('highlight') && 'bg-muted'
              )}
              title={UI_LABELS.LABEL_1434}
            >
              <Highlighter size="1em" />
            </button>
            {showHighlightPicker && (
              <div className="absolute left-0 top-full mt-1 flex flex-col gap-1 p-2 bg-card rounded-lg shadow-lg border border-border z-50">
                <div className="grid grid-cols-5 gap-1">
                  {HIGHLIGHTS.map(color => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setHighlight(color.value)}
                      className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                      style={{ backgroundColor: color.value }}
                      title={color.label}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={removeHighlight}
                  className="text-xs text-morandi-secondary hover:text-morandi-primary mt-1"
                >
                  {UI_LABELS.LABEL_4248}
                </button>
              </div>
            )}
          </div>

          {!singleLine && (
            <>
              <div className="w-px h-5 bg-muted mx-1" />
              <span className="text-[0.625rem] text-morandi-muted px-1 select-none">
                Shift+Enter 換行
              </span>
            </>
          )}
        </div>
      )}

      {/* 編輯區 */}
      <EditorContent editor={editor} />

      {/* Placeholder */}
      {editor.isEmpty && placeholder && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-morandi-muted pointer-events-none">
          {placeholder}
        </div>
      )}
    </div>
  )
}

// 輔助函數：將 HTML 轉為純文字
function _htmlToPlainText(html: string): string {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, '')
}

// 輔助函數：安全渲染 HTML
function _RichTextDisplay({ html, className }: { html: string; className?: string }) {
  if (!html) return null
  return <span className={className} dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />
}
