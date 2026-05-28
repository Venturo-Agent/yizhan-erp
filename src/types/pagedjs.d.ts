/**
 * pagedjs 沒提供 official .d.ts，這裡寫一個 minimal declaration、只暴露我們會用到的 API。
 * pagedjs 本身是 CSS Paged Media polyfill（純 browser、操作 DOM）。
 */
declare module 'pagedjs' {
  export class Previewer {
    constructor()
    preview(
      content: string | HTMLElement | Document,
      stylesheets: string[],
      renderTo: HTMLElement
    ): Promise<unknown>
  }
}

declare module 'pagedjs/dist/paged.esm.js' {
  /**
   * 用 dist 已 bundled 版避開 webpack 處理 src/ 拿不到 contains helper 的 bug
   * (pagedjs 0.4.3 + Next.js + Turbopack/webpack 的整合 issue)
   */
  export class Previewer {
    constructor()
    preview(
      content: string | HTMLElement | Document,
      stylesheets: string[],
      renderTo: HTMLElement
    ): Promise<unknown>
  }
}
