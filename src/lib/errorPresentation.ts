import type { DownloadErrorKind } from '../types'
import { getAuthProvider } from './authProviders'

export interface ErrorPresentation {
  messageKey: string
  showSignIn: boolean
}

const MESSAGE_KEYS: Record<DownloadErrorKind, string> = {
  auth: 'downloads.error.auth',
  cookies: 'downloads.error.cookies',
  ffmpeg: 'downloads.error.ffmpeg',
  unavailable: 'downloads.error.unavailable',
  network: 'downloads.error.network',
  unsupported: 'downloads.error.unsupported',
  unknown: 'downloads.error.unknown',
}

export function getErrorPresentation(
  kind: DownloadErrorKind,
  cookiesFailed: boolean,
  url: string,
): ErrorPresentation {
  const provider = getAuthProvider(url)
  const messageKey = kind === 'auth' && cookiesFailed ? 'downloads.error.auth.cookies' : MESSAGE_KEYS[kind]
  return { messageKey, showSignIn: kind === 'auth' && provider !== null }
}
