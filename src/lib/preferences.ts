import { DEFAULT_PREFERENCES } from '../types'
import type { Preferences } from '../types'

export function normalizePreferences(value: unknown): Preferences {
  const prefs = { ...DEFAULT_PREFERENCES }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return prefs
  const stored = value as Record<string, unknown>
  for (const [key, fallback] of Object.entries(DEFAULT_PREFERENCES)) {
    if (Object.hasOwn(stored, key) && typeof stored[key] === typeof fallback) {
      Object.assign(prefs, { [key]: stored[key] })
    }
  }
  return prefs
}

export interface WindowBounds {
  width: number
  height: number
  x?: number
  y?: number
}

export function normalizeWindowBounds(value: unknown): WindowBounds | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  const { width, height, x, y } = value as Record<string, unknown>
  if (typeof width !== 'number' || !Number.isFinite(width) || width <= 0 ||
      typeof height !== 'number' || !Number.isFinite(height) || height <= 0) return null
  if (x !== undefined && (typeof x !== 'number' || !Number.isFinite(x))) return null
  if (y !== undefined && (typeof y !== 'number' || !Number.isFinite(y))) return null
  return { width, height, ...(x !== undefined ? { x } : {}), ...(y !== undefined ? { y } : {}) }
}
