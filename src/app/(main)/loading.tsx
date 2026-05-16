// Server Suspense fallback 為空、避免跟 client-side ModuleGuard ModuleLoading
// 在 hydrate 切換時 layout reflow 造成「跳一下」。
// ModuleGuard 是唯一的 loading source（content area center、跟 page data loading 同位置）。
export default function MainLoading() {
  return null
}
