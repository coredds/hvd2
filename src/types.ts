export type DownloadStatus = 'QUEUED' | 'DOWNLOADING' | 'PAUSED' | 'COMPLETED' | 'ERROR'

export interface DownloadItem {
  id: string
  url: string
  title: string
  format: string
  status: DownloadStatus
  progress: number
  errorMessage: string
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
  cookiesFile?: string
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

export type ThemeMode = 'auto' | 'light' | 'dark'

export type DependencyType = 'ytdlp' | 'ffmpeg' | 'deno'