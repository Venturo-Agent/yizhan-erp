import { describe, it, expect } from 'vitest'
import { sanitizeHtml, sanitizeStrict, sanitizeSvg, sanitizeCss } from '@/lib/utils/sanitize'

describe('sanitize', () => {
  describe('sanitizeHtml', () => {
    describe('Empty / nullish input', () => {
      it('should return empty string for empty input', () => {
        expect(sanitizeHtml('')).toBe('')
      })

      it('should return empty string for null-coerced empty', () => {
        // helper checks falsy short-circuit
        expect(sanitizeHtml('' as string)).toBe('')
      })
    })

    describe('Plain content passthrough', () => {
      it('should preserve plain text', () => {
        expect(sanitizeHtml('Hello world')).toBe('Hello world')
      })

      it('should preserve safe block tags', () => {
        const html = '<p>Hello <strong>world</strong></p>'
        expect(sanitizeHtml(html)).toBe('<p>Hello <strong>world</strong></p>')
      })

      it('should preserve links', () => {
        const html = '<a href="https://example.com">link</a>'
        const result = sanitizeHtml(html)
        expect(result).toContain('href="https://example.com"')
      })
    })

    describe('XSS protection', () => {
      it('should strip <script> tags', () => {
        const dirty = '<p>safe</p><script>alert(1)</script>'
        const clean = sanitizeHtml(dirty)
        expect(clean).not.toContain('<script')
        expect(clean).not.toContain('alert(1)')
        expect(clean).toContain('<p>safe</p>')
      })

      it('should strip <iframe> tags', () => {
        const dirty = '<iframe src="evil.com"></iframe><p>ok</p>'
        const clean = sanitizeHtml(dirty)
        expect(clean).not.toContain('<iframe')
        expect(clean).toContain('<p>ok</p>')
      })

      it('should strip <object> tags', () => {
        const dirty = '<object data="evil.swf"></object>'
        expect(sanitizeHtml(dirty)).not.toContain('<object')
      })

      it('should strip <embed> tags', () => {
        const dirty = '<embed src="evil.swf">'
        expect(sanitizeHtml(dirty)).not.toContain('<embed')
      })

      it('should strip <form> and <input>', () => {
        const dirty = '<form><input name="x"></form>'
        const clean = sanitizeHtml(dirty)
        expect(clean).not.toContain('<form')
        expect(clean).not.toContain('<input')
      })

      it('should strip onclick attribute', () => {
        const dirty = '<div onclick="alert(1)">text</div>'
        const clean = sanitizeHtml(dirty)
        expect(clean).not.toContain('onclick')
        expect(clean).not.toContain('alert(1)')
      })

      it('should strip onerror attribute on img', () => {
        const dirty = '<img src=x onerror="alert(1)">'
        const clean = sanitizeHtml(dirty)
        expect(clean).not.toContain('onerror')
      })

      it('should strip onload attribute', () => {
        const dirty = '<body onload="alert(1)">text</body>'
        const clean = sanitizeHtml(dirty)
        expect(clean).not.toContain('onload')
      })

      it('should strip onmouseover/onmouseout', () => {
        const dirty = '<a onmouseover="x()" onmouseout="y()">link</a>'
        const clean = sanitizeHtml(dirty)
        expect(clean).not.toContain('onmouseover')
        expect(clean).not.toContain('onmouseout')
      })

      it('should strip javascript: URL in href', () => {
        const dirty = '<a href="javascript:alert(1)">click</a>'
        const clean = sanitizeHtml(dirty)
        // DOMPurify strips javascript: protocol from href by default
        expect(clean.toLowerCase()).not.toContain('javascript:alert')
      })
    })
  })

  describe('sanitizeStrict', () => {
    it('should return empty string for empty input', () => {
      expect(sanitizeStrict('')).toBe('')
    })

    it('should preserve allowed text format tags', () => {
      const html = '<p>Hello <strong>world</strong> <em>!</em></p>'
      expect(sanitizeStrict(html)).toBe('<p>Hello <strong>world</strong> <em>!</em></p>')
    })

    it('should preserve lists', () => {
      const html = '<ul><li>a</li><li>b</li></ul>'
      expect(sanitizeStrict(html)).toBe('<ul><li>a</li><li>b</li></ul>')
    })

    it('should preserve headings', () => {
      const html = '<h1>title</h1><h2>sub</h2>'
      expect(sanitizeStrict(html)).toBe('<h1>title</h1><h2>sub</h2>')
    })

    it('should preserve blockquote / code / pre', () => {
      const html = '<blockquote>q</blockquote><pre><code>x</code></pre>'
      const clean = sanitizeStrict(html)
      expect(clean).toContain('<blockquote>')
      expect(clean).toContain('<code>')
      expect(clean).toContain('<pre>')
    })

    it('should strip disallowed tags like img', () => {
      const html = '<p>text</p><img src="x.png">'
      const clean = sanitizeStrict(html)
      expect(clean).not.toContain('<img')
      expect(clean).toContain('<p>text</p>')
    })

    it('should strip <script>', () => {
      const dirty = '<p>ok</p><script>alert(1)</script>'
      const clean = sanitizeStrict(dirty)
      expect(clean).not.toContain('<script')
      expect(clean).not.toContain('alert(1)')
    })

    it('should strip table tags (not in allowlist)', () => {
      const html = '<table><tr><td>cell</td></tr></table>'
      const clean = sanitizeStrict(html)
      expect(clean).not.toContain('<table')
      expect(clean).not.toContain('<td')
    })

    it('should preserve allowed attributes (href, target, rel, class, style)', () => {
      const html = '<a href="https://example.com" target="_blank" rel="noopener" class="link">x</a>'
      const clean = sanitizeStrict(html)
      expect(clean).toContain('href="https://example.com"')
      expect(clean).toContain('target="_blank"')
      expect(clean).toContain('rel="noopener"')
      expect(clean).toContain('class="link"')
    })

    it('should strip event handler attributes', () => {
      const html = '<p onclick="alert(1)">x</p>'
      const clean = sanitizeStrict(html)
      expect(clean).not.toContain('onclick')
    })
  })

  describe('sanitizeSvg', () => {
    it('should return empty string for empty input', () => {
      expect(sanitizeSvg('')).toBe('')
    })

    it('should preserve basic SVG structure', () => {
      const svg = '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40"/></svg>'
      const clean = sanitizeSvg(svg)
      expect(clean).toContain('<svg')
      expect(clean).toContain('<circle')
    })

    it('should strip onload from svg root', () => {
      const svg = '<svg onload="alert(1)"><circle r="10"/></svg>'
      const clean = sanitizeSvg(svg)
      expect(clean).not.toContain('onload')
    })

    it('should strip onclick from svg children', () => {
      const svg = '<svg><circle r="10" onclick="alert(1)"/></svg>'
      const clean = sanitizeSvg(svg)
      expect(clean).not.toContain('onclick')
    })

    it('should strip onerror', () => {
      const svg = '<svg><image href="x" onerror="alert(1)"/></svg>'
      const clean = sanitizeSvg(svg)
      expect(clean).not.toContain('onerror')
    })
  })

  describe('sanitizeCss', () => {
    it('should return empty string for empty input', () => {
      expect(sanitizeCss('')).toBe('')
    })

    it('should preserve normal CSS rules', () => {
      const css = '.foo { color: red; padding: 10px; }'
      expect(sanitizeCss(css)).toBe(css)
    })

    it('should strip CSS expression()', () => {
      const css = '.foo { width: expression(alert(1)); }'
      const clean = sanitizeCss(css)
      expect(clean).not.toContain('expression(')
      expect(clean).not.toMatch(/expression\s*\(/i)
    })

    it('should strip uppercase EXPRESSION()', () => {
      const css = '.foo { width: EXPRESSION(alert(1)); }'
      const clean = sanitizeCss(css)
      expect(clean).not.toMatch(/expression\s*\(/i)
    })

    it('should strip javascript: protocol', () => {
      const css = '.foo { background: url(javascript:alert(1)); }'
      const clean = sanitizeCss(css)
      expect(clean).not.toMatch(/javascript\s*:/i)
    })

    it('should strip @import url(', () => {
      const css = '@import url(http://evil.com/x.css);'
      const clean = sanitizeCss(css)
      expect(clean).not.toMatch(/@import\s+url\s*\(/i)
    })

    it('should strip behavior:', () => {
      const css = '.foo { behavior: url(evil.htc); }'
      const clean = sanitizeCss(css)
      expect(clean).not.toMatch(/behavior\s*:/i)
    })

    it('should strip -moz-binding:', () => {
      const css = '.foo { -moz-binding: url(evil.xml); }'
      const clean = sanitizeCss(css)
      expect(clean).not.toMatch(/-moz-binding\s*:/i)
    })

    it('should strip with extra whitespace variants', () => {
      const css = '.foo { width: expression  ( alert(1) ); }'
      const clean = sanitizeCss(css)
      expect(clean).not.toMatch(/expression\s*\(/i)
    })
  })
})
