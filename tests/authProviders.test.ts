import { describe, it, expect } from 'vitest'
import { getAuthProvider, getLoginUrl, getBrowserLabel } from '../src/lib/authProviders'

describe('getAuthProvider', () => {
  it('detects youtube hosts', () => {
    expect(getAuthProvider('https://www.youtube.com/watch?v=1')).toBe('youtube')
    expect(getAuthProvider('https://youtu.be/abc')).toBe('youtube')
  })
  it('detects vimeo', () => {
    expect(getAuthProvider('https://vimeo.com/76979871')).toBe('vimeo')
  })
  it('returns null for other and invalid urls', () => {
    expect(getAuthProvider('https://example.com/x')).toBeNull()
    expect(getAuthProvider('not a url')).toBeNull()
  })
})

describe('getLoginUrl', () => {
  it('returns provider login urls', () => {
    expect(getLoginUrl('youtube')).toBe('https://www.youtube.com')
    expect(getLoginUrl('vimeo')).toBe('https://vimeo.com/log_in')
  })
})

describe('getBrowserLabel', () => {
  it('maps known sources and defaults to Chrome', () => {
    expect(getBrowserLabel('firefox')).toBe('Firefox')
    expect(getBrowserLabel('unknown')).toBe('Chrome')
  })
})
