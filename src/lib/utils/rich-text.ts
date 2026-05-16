/**
 * 富文本渲染輔助函數
 */
import { sanitizeHtml } from './sanitize'

/**
 * 判斷字串是否包含 HTML 標籤
 */
export function isHtmlString(str: string | null | undefined): boolean {
  if (!str) return false
  return /<[^>]+>/.test(str)
}

/**
 * 將 HTML 轉為純文字
 */
export function htmlToPlainText(html: string | null | undefined): string {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, '')
}

/**
 * 清理 Tiptap 輸出的 HTML
 * 移除外層 <p> 標籤，保留內部樣式
 */
export function cleanTiptapHtml(html: string | null | undefined): string {
  if (!html) return ''
  // 移除外層 <p> 標籤，並消毒 HTML 防止 XSS
  const stripped = html.replace(/^<p>/, '').replace(/<\/p>$/, '')
  return sanitizeHtml(stripped)
}

/**
 * 安全地渲染可能包含 HTML 的文字
 * 如果是 HTML，使用 dangerouslySetInnerHTML
 * 如果是純文字，直接顯示
 */
export function renderRichText(
  text: string | null | undefined,
  defaultText?: string
): { html?: string; text?: string } {
  const content = text || defaultText || ''
  if (isHtmlString(content)) {
    return { html: sanitizeHtml(content) }
  }
  return { text: content }
}
