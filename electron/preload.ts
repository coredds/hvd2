import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPITransport } from '../src/ipc'
import { createDownloadEventSubscriptions } from './services/DownloadEventBridge'

console.log('[preload] executing, exposing electronAPITransport...')

const api: ElectronAPITransport = {
  downloads: {
    start: (item, options) =>
      ipcRenderer.invoke('download:start', item, options),
    cancel: (id: string) =>
      ipcRenderer.invoke('download:cancel', id),
    extractTitle: (url: string, browser?: string) =>
      ipcRenderer.invoke('download:extract-title', url, browser),
    ...createDownloadEventSubscriptions(ipcRenderer),
  },
  deps: {
    checkYtDlp: () => ipcRenderer.invoke('deps:check-ytdlp'),
    checkFFmpeg: () => ipcRenderer.invoke('deps:check-ffmpeg'),
    checkDeno: () => ipcRenderer.invoke('deps:check-deno'),
    downloadYtDlp: () => ipcRenderer.invoke('deps:download-ytdlp'),
    downloadFFmpeg: () => ipcRenderer.invoke('deps:download-ffmpeg'),
    downloadDeno: () => ipcRenderer.invoke('deps:download-deno'),
    updateYtDlpSelf: () => ipcRenderer.invoke('deps:update-ytdlp-self'),
    openFolder: (type: string) => ipcRenderer.invoke('deps:open-folder', type),
    getYtDlpVersion: () => ipcRenderer.invoke('deps:get-ytdlp-version'),
    getYtDlpLatestVersion: () => ipcRenderer.invoke('deps:get-ytdlp-latest-version'),
  },
  auth: {
    testCookies: (source: string) => ipcRenderer.invoke('auth:test-cookies', source),
  },
  prefs: {
    get: (key: string) => ipcRenderer.invoke('prefs:get', key),
    set: (key, value) => ipcRenderer.invoke('prefs:set', key, value),
    getAll: () => ipcRenderer.invoke('prefs:getAll'),
  },
  dialog: {
    openFolder: () => ipcRenderer.invoke('dialog:open-folder'),
    showAlert: (opts: { title: string; message: string; type?: string; buttons?: string[] }) =>
      ipcRenderer.invoke('dialog:alert', opts),
  },
  app: {
    getLocale: () => ipcRenderer.invoke('app:get-locale'),
    openPath: (path: string) => ipcRenderer.invoke('app:open-path', path),
    restart: () => ipcRenderer.invoke('app:restart'),
    openProvider: (url: string, source: string) => ipcRenderer.invoke('app:open-provider', url, source),
    getVersion: () => ipcRenderer.invoke('app:get-version'),
  },
}

contextBridge.exposeInMainWorld('electronAPITransport', api)
