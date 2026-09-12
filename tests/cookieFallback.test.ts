import { describe, it, expect } from 'vitest'
import { stripCookieArgs, isBrowserCookieError } from '../electron/services/cookieFallback'

describe('stripCookieArgs', () => {
  it('removes --cookies-from-browser and its value', () => {
    expect(stripCookieArgs(['a', '--cookies-from-browser', 'chrome', 'url'])).toEqual(['a', 'url'])
  })

  it('leaves args unchanged when the flag is absent', () => {
    expect(stripCookieArgs(['a', 'url'])).toEqual(['a', 'url'])
  })
})

describe('isBrowserCookieError', () => {
  it('detects missing cookie database errors', () => {
    expect(isBrowserCookieError('ERROR: could not find chrome cookies database in "C:\\Users"')).toBe(true)
  })

  it('detects cookie extraction failures', () => {
    expect(isBrowserCookieError('Failed to extract cookies from browser')).toBe(true)
  })

  it('ignores unrelated errors', () => {
    expect(isBrowserCookieError('ERROR: Video unavailable')).toBe(false)
  })
})
