import { describe, expect, it } from 'vitest'
import { normalizePreferences, normalizeWindowBounds } from '../src/lib/preferences'
import { DEFAULT_PREFERENCES } from '../src/types'

describe('persisted preference normalization', () => {
  it('retains valid overrides including false and empty string values', () => {
    const stored = { 'app.theme': 'dark', 'browser.cookies.enabled': false, 'video.output.directory': '' }
    expect(normalizePreferences(stored)).toEqual({ ...DEFAULT_PREFERENCES, ...stored })
  })

  it('falls back to defaults when persisted values have the wrong primitive types', () => {
    expect(normalizePreferences({ 'app.theme': 42, 'embed.thumbnail': 'false', 'audio.quality': null }))
      .toEqual(DEFAULT_PREFERENCES)
  })

  it.each([null, undefined, 1, 'text', []])('handles non-object preference data: %j', (value) => {
    expect(normalizePreferences(value)).toEqual(DEFAULT_PREFERENCES)
  })

  it('does not mutate the defaults or the stored record', () => {
    const stored = { 'audio.format': 'opus', unknown: 'preserve on disk' }
    expect(normalizePreferences(stored)['audio.format']).toBe('opus')
    expect(DEFAULT_PREFERENCES['audio.format']).toBe('mp3')
    expect(stored).toEqual({ 'audio.format': 'opus', unknown: 'preserve on disk' })
  })
})

describe('window bounds normalization', () => {
  it('preserves valid coordinates, including negative monitor positions', () => {
    const bounds = { x: -1000, y: 0, width: 1100, height: 900 }
    expect(normalizeWindowBounds(bounds)).toEqual(bounds)
  })

  it('retains legacy size-only bounds', () => {
    expect(normalizeWindowBounds({ width: 1000, height: 800 })).toEqual({ width: 1000, height: 800 })
  })

  it.each([
    null, [], { width: '1100', height: 900 }, { width: 0, height: 900 },
    { width: 1100, height: -1 }, { width: NaN, height: 900 },
    { x: 'left', y: 0, width: 1100, height: 900 }, { x: Infinity, width: 1100, height: 900 },
  ])('rejects invalid bounds: %j', (value) => {
    expect(normalizeWindowBounds(value)).toBeNull()
  })
})
