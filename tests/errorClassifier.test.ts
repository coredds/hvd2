import { describe, it, expect } from 'vitest'
import { classifyDownloadError, summarizeError } from '../electron/services/ErrorClassifier'

describe('classifyDownloadError', () => {
  it('detects browser cookie database failures', () => {
    expect(classifyDownloadError('ERROR: could not find chrome cookies database in "C:\\Users"')).toBe('cookies')
  })

  it('detects sign-in / bot-check errors without misclassifying the advice text', () => {
    const msg = "ERROR: [youtube] abc: Sign in to confirm you're not a bot. Use --cookies-from-browser or --cookies for the authentication."
    expect(classifyDownloadError(msg)).toBe('auth')
  })

  it('detects ffmpeg errors', () => {
    expect(classifyDownloadError('ERROR: Postprocessing: ffmpeg not found. Please install or provide the path')).toBe('ffmpeg')
  })

  it('detects unavailable videos', () => {
    expect(classifyDownloadError('ERROR: Video unavailable')).toBe('unavailable')
  })

  it('detects network errors', () => {
    expect(classifyDownloadError('ERROR: unable to download webpage: [Errno 11001] getaddrinfo failed')).toBe('network')
  })

  it('detects unsupported urls', () => {
    expect(classifyDownloadError('ERROR: Unsupported URL: https://example.com/x')).toBe('unsupported')
  })

  it('falls back to unknown', () => {
    expect(classifyDownloadError('something odd happened')).toBe('unknown')
  })
})

describe('summarizeError', () => {
  it('joins the last two non-empty lines', () => {
    expect(summarizeError('WARNING: a\n\nERROR: b\n')).toBe('WARNING: a | ERROR: b')
    expect(summarizeError('ERROR: only\n')).toBe('ERROR: only')
  })

  it('truncates long output to 500 characters', () => {
    expect(summarizeError('x'.repeat(600)).length).toBe(500)
  })
})
