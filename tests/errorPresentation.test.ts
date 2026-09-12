import { describe, it, expect } from 'vitest'
import { getErrorPresentation } from '../src/lib/errorPresentation'
import type { DownloadErrorKind } from '../src/types'

const yt = 'https://www.youtube.com/watch?v=1'

describe('getErrorPresentation', () => {
  it('combines auth with cookie failure', () => {
    expect(getErrorPresentation('auth', true, yt).messageKey).toBe('downloads.error.auth.cookies')
  })
  it('maps auth without cookie failure', () => {
    expect(getErrorPresentation('auth', false, yt).messageKey).toBe('downloads.error.auth')
  })
  it('maps each other kind', () => {
    const cases: [DownloadErrorKind, string][] = [
      ['cookies', 'downloads.error.cookies'],
      ['ffmpeg', 'downloads.error.ffmpeg'],
      ['unavailable', 'downloads.error.unavailable'],
      ['network', 'downloads.error.network'],
      ['unsupported', 'downloads.error.unsupported'],
      ['unknown', 'downloads.error.unknown'],
    ]
    for (const [kind, key] of cases) {
      expect(getErrorPresentation(kind, false, yt).messageKey).toBe(key)
    }
  })
  it('shows sign-in only for auth with a known provider', () => {
    expect(getErrorPresentation('auth', false, yt).showSignIn).toBe(true)
    expect(getErrorPresentation('auth', false, 'https://example.com/x').showSignIn).toBe(false)
    expect(getErrorPresentation('network', false, yt).showSignIn).toBe(false)
  })
  it('shows sign-in for vimeo', () => {
    expect(getErrorPresentation('auth', false, 'https://vimeo.com/76979871').showSignIn).toBe(true)
  })
})
