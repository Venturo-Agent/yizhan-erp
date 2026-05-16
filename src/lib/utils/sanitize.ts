/**
 * HTML 消毒工具
 *
 * 統一所有 dangerouslySetInnerHTML 的 HTML 消毒邏輯
 * 使用 DOMPurify 防止 XSS 攻擊
 */
import DOMPurify from 'dompurify'

/**
 * 基本 HTML 消毒 — 移除 script、iframe 等危險標籤
 * 適用於一般富文本內容
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return ''
  return DOMPurify.sanitize(dirty, {
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['onclick', 'onerror', 'onload', 'onmouseover', 'onmouseout', 'onfocus', 'onblur'],
  })
}

/**
 * 嚴格消毒 — 只允許基本文字格式標籤
 * 適用於使用者輸入的內容
 */
export function sanitizeStrict(dirty: string): string {
  if (!dirty) return ''
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'p',
      'br',
      'strong',
      'em',
      'b',
      'i',
      'u',
      's',
      'ul',
      'ol',
      'li',
      'a',
      'span',
      'sub',
      'sup',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'blockquote',
      'code',
      'pre',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style'],
  })
}

/**
 * SVG 消毒 — 允許 SVG 標籤但移除危險屬性
 * 適用於 SVG 插圖
 */
export function sanitizeSvg(dirty: string): string {
  if (!dirty) return ''
  return DOMPurify.sanitize(dirty, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_ATTR: ['onclick', 'onerror', 'onload'],
  })
}

/**
 * CSS 消毒 — 移除危險的 CSS 表達式
 * 適用於 <style> 標籤內容
 */
export function sanitizeCss(dirty: string): string {
  if (!dirty) return ''
  // 移除 JavaScript 表達式和 url() 中的 javascript:
  return dirty
    .replace(/expression\s*\(/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/@import\s+url\s*\(/gi, '')
    .replace(/behavior\s*:/gi, '')
    .replace(/-moz-binding\s*:/gi, '')
}
