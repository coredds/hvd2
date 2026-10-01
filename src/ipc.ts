import type { DownloadItem, DownloadOptions, DependencyType, DownloadErrorKind, Preferences } from './types'

export interface DownloadEventPayloads {
  progress: { id: string; progress: number }
  log: { id: string; line: string }
  status: { id: string; key: string }
  complete: { id: string; filePath: string }
  error: { id: string; message: string; kind: DownloadErrorKind; cookiesFailed: boolean }
  paused: { id: string }
}

export type DownloadEventListener<T> = (event: unknown, data: T) => void

export type DownloadEventTransport = {
  [K in keyof DownloadEventPayloads as `on${Capitalize<K>}`]: (callback: DownloadEventListener<DownloadEventPayloads[K]>) => () => void
}

export type DownloadEventSubscriptions = {
  [K in keyof DownloadEventPayloads as `on${Capitalize<K>}`]: (callback: DownloadEventListener<DownloadEventPayloads[K]>) => void
} & {
  [K in keyof DownloadEventPayloads as `off${Capitalize<K>}`]: (callback: DownloadEventListener<DownloadEventPayloads[K]>) => void
}

export interface ElectronAPI {
  downloads: DownloadEventSubscriptions & {
    start: (item: DownloadItem, options: DownloadOptions) => Promise<void>
    cancel: (id: string) => Promise<void>
    extractTitle: (url: string, browser?: string) => Promise<string>
  }
  deps: {
    checkYtDlp: () => Promise<{ available: boolean; version?: string; isRecent?: boolean }>
    checkFFmpeg: () => Promise<boolean>
    checkDeno: () => Promise<boolean>
    downloadYtDlp: () => Promise<void>
    downloadFFmpeg: () => Promise<void>
    downloadDeno: () => Promise<void>
    updateYtDlpSelf: () => Promise<{ success: boolean; message: string }>
    openFolder: (type: DependencyType) => Promise<void>
    getYtDlpVersion: () => Promise<string>
    getYtDlpLatestVersion: () => Promise<string | null>
  }
  auth: {
    testCookies: (source: string) => Promise<{ ok: boolean; detail: string }>
  }
  prefs: {
    get: (key: string) => Promise<unknown>
    set: <K extends keyof Preferences>(key: K, value: Preferences[K]) => Promise<void>
    getAll: () => Promise<Preferences>
  }
  dialog: {
    openFolder: () => Promise<string | null>
    showAlert: (opts: { title: string; message: string; type?: string; buttons?: string[] }) => Promise<number>
  }
  app: {
    getLocale: () => Promise<string>
    openPath: (path: string) => Promise<void>
    restart: () => Promise<void>
    openProvider: (url: string, source: string) => Promise<boolean>
    getVersion: () => Promise<string>
  }
}

export type ElectronAPITransport = Omit<ElectronAPI, 'downloads'> & {
  downloads: Pick<ElectronAPI['downloads'], 'start' | 'cancel' | 'extractTitle'> & DownloadEventTransport
}
