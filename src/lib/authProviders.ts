export type AuthProvider = 'youtube' | 'vimeo'

export function getAuthProvider(url: string): AuthProvider | null {
  let host: string
  try {
    host = new URL(url).hostname.toLowerCase()
  } catch {
    return null
  }
  if (host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtu.be' || host.endsWith('.youtu.be')) {
    return 'youtube'
  }
  if (host === 'vimeo.com' || host.endsWith('.vimeo.com')) return 'vimeo'
  return null
}

export function getLoginUrl(provider: AuthProvider): string {
  return provider === 'youtube' ? 'https://www.youtube.com' : 'https://vimeo.com/log_in'
}

const BROWSER_LABELS: Record<string, string> = {
  chrome: 'Chrome',
  brave: 'Brave',
  chromium: 'Chromium',
  edge: 'Edge',
  firefox: 'Firefox',
  opera: 'Opera',
  vivaldi: 'Vivaldi',
}

export function getBrowserLabel(source: string): string {
  return Object.prototype.hasOwnProperty.call(BROWSER_LABELS, source) ? BROWSER_LABELS[source] : 'Chrome'
}
