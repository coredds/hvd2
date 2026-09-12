import type { DownloadErrorKind } from '../../src/types'

const COOKIE_RE = /cookies database|failed to extract cookies|failed to decrypt.*cookies|unable to decrypt.*cookies|dpapi/i
const AUTH_RE = /sign in to confirm|not a bot|login required|log in|members-only|age.?restricted|private video|confirm your age|http error 403|403 forbidden/i
const FFMPEG_RE = /ffmpeg|postprocessing|post-processor/i
const UNAVAILABLE_RE = /video unavailable|has been removed|no longer available|not available in your country|geo.?restricted|uploader has not made|deleted/i
const NETWORK_RE = /timed out|timeout|temporary failure|name or service not known|getaddrinfo|network is unreachable|unable to connect|connection reset|ssl/i
const UNSUPPORTED_RE = /unsupported url|no video formats found|not a valid url|unable to extract/i

export function classifyDownloadError(stderr: string): DownloadErrorKind {
  if (COOKIE_RE.test(stderr)) return 'cookies'
  if (AUTH_RE.test(stderr)) return 'auth'
  if (FFMPEG_RE.test(stderr)) return 'ffmpeg'
  if (UNAVAILABLE_RE.test(stderr)) return 'unavailable'
  if (NETWORK_RE.test(stderr)) return 'network'
  if (UNSUPPORTED_RE.test(stderr)) return 'unsupported'
  return 'unknown'
}

export function summarizeError(stderr: string): string {
  const lines = stderr.split('\n').map((line) => line.trim()).filter(Boolean)
  const summary = lines.slice(-2).join(' | ')
  return summary.length > 500 ? summary.slice(0, 500) : summary
}
