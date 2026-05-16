import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'
import { vi } from 'vitest'

// Mock localStorage (for Zustand persist middleware)
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get length() {
      return Object.keys(store).length
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  }
})()
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

// IndexedDB 走 fake-indexeddb（line 2 已 auto-import、提供 W3C-compliant in-memory IDB）

// Mock Supabase
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    })),
  },
}))
