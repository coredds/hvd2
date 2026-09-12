export type DownloadStatus = 'QUEUED' | 'DOWNLOADING' | 'PAUSED' | 'COMPLETED' | 'ERROR'

export type DownloadErrorKind =
  | 'auth'
  | 'cookies'
  | 'ffmpeg'
  | 'unavailable'
  | 'network'
  | 'unsupported'
  | 'unknown'

export interface DownloadItem {
  id: string
  url: string
  title: string
  format: string
  audioOnly: boolean
  status: DownloadStatus
  progress: number
  errorMessage: string
  errorKind: DownloadErrorKind
  cookiesFailed: boolean
  filePath: string
  noPlaylist: boolean
}

export interface DownloadOptions {
  audioOnly: boolean
  audioFormat: string
  audioQuality: string
  videoQuality: string
  videoFormat: string
  videoAudioFormat: string
  outputDirectory: string
  embedSubtitles: boolean
  embedThumbnail: boolean
  addMetadata: boolean
  useBrowserCookies: boolean
  browserSource: string
}

export interface Preferences {
  'audio.format': string
  'audio.quality': string
  'video.quality': string
  'video.format': string
  'video.audio.format': string
  'video.output.directory': string
  'audio.output.directory': string
  'embed.subtitles': boolean
  'embed.thumbnail': boolean
  'add.metadata': boolean
  'embed.thumbnail.audio': boolean
  'add.metadata.audio': boolean
  'download.type.audio': boolean
  'use.separate.folders': boolean
  'app.language': string
  'app.theme': string
  'browser.cookies.enabled': boolean
  'browser.cookies.source': string
}

export const DEFAULT_PREFERENCES: Preferences = {
  'audio.format': 'mp3',
  'audio.quality': '192k',
  'video.quality': '1080p',
  'video.format': 'mp4',
  'video.audio.format': 'aac',
  'video.output.directory': '',
  'audio.output.directory': '',
  'embed.subtitles': false,
  'embed.thumbnail': true,
  'add.metadata': false,
  'embed.thumbnail.audio': true,
  'add.metadata.audio': true,
  'download.type.audio': false,
  'use.separate.folders': true,
  'app.language': 'auto',
  'app.theme': 'auto',
  'browser.cookies.enabled': true,
  'browser.cookies.source': 'chrome',
}

export type ThemeMode = 'auto' | 'light' | 'dark'

export type DependencyType = 'ytdlp' | 'ffmpeg' | 'deno'