import type { DownloadItem, DownloadOptions, DependencyType } from './types'

export interface ElectronAPI {
  downloads: {
    start: (item: DownloadItem, options: DownloadOptions) => Promise<void>
    cancel: (id: string) => Promise<void>
    extractTitle: (url: string, browser?: string) => Promise<string>
    onProgress: (cb: (event: any, data: { id: string; progress: number }) => void) => void
    onLog: (cb: (event: any, data: { id: string; line: string }) => void) => void
    onStatus: (cb: (event: any, data: { id: string; key: string }) => void) => void
    onComplete: (cb: (event: any, data: { id: string; filePath: string }) => void) => void
    onError: (cb: (event: any, data: { id: string; message: string }) => void) => void
    onPaused: (cb: (event: any, data: { id: string }) => void) => void
  }
  deps: {
    checkYtDlp: () => Promise<{ available: boolean; version?: string; isRecent?: boolean }>
    checkFFmpeg: () => Promise<boolean>
    checkDeno: () => Promise<boolean>
    downloadYtDlp: () => Promise<void>
    downloadFFmpeg: () => Promise<void>
    downloadDeno: () => Promise<void>
    openFolder: (type: DependencyType) => Promise<void>
    getYtDlpVersion: () => Promise<string>
  }
  prefs: {
    get: (key: string) => Promise<any>
    set: (key: string, value: any) => Promise<void>
    getAll: () => Promise<Record<string, any>>
  }
  dialog: {
    openFolder: () => Promise<string | null>
    showAlert: (opts: { title: string; message: string; type?: string; buttons?: string[] }) => Promise<number>
  }
  app: {
    getLocale: () => Promise<string>
    openPath: (path: string) => Promise<void>
    restart: () => Promise<void>
    loginUrl: (url: string) => Promise<boolean>
    getCookiesFile: () => Promise<string | null>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}