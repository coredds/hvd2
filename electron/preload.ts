import { contextBridge, ipcRenderer } from 'electron'

console.log('[preload] executing, exposing electronAPI...')

contextBridge.exposeInMainWorld('electronAPI', {
  downloads: {
    start: (item: any, options: any) =>
      ipcRenderer.invoke('download:start', item, options),
    cancel: (id: string) =>
      ipcRenderer.invoke('download:cancel', id),
    extractTitle: (url: string, browser?: string) =>
      ipcRenderer.invoke('download:extract-title', url, browser),
    onProgress: (cb: any) =>
      ipcRenderer.on('download:progress', cb),
    onLog: (cb: any) =>
      ipcRenderer.on('download:log', cb),
    onStatus: (cb: any) =>
      ipcRenderer.on('download:status', cb),
    onComplete: (cb: any) =>
      ipcRenderer.on('download:complete', cb),
    onError: (cb: any) =>
      ipcRenderer.on('download:error', cb),
    onPaused: (cb: any) =>
      ipcRenderer.on('download:paused', cb),
  },
  deps: {
    checkYtDlp: () => ipcRenderer.invoke('deps:check-ytdlp'),
    checkFFmpeg: () => ipcRenderer.invoke('deps:check-ffmpeg'),
    checkDeno: () => ipcRenderer.invoke('deps:check-deno'),
    downloadYtDlp: () => ipcRenderer.invoke('deps:download-ytdlp'),
    downloadFFmpeg: () => ipcRenderer.invoke('deps:download-ffmpeg'),
    downloadDeno: () => ipcRenderer.invoke('deps:download-deno'),
    openFolder: (type: string) => ipcRenderer.invoke('deps:open-folder', type),
    getYtDlpVersion: () => ipcRenderer.invoke('deps:get-ytdlp-version'),
  },
  prefs: {
    get: (key: string) => ipcRenderer.invoke('prefs:get', key),
    set: (key: string, value: any) => ipcRenderer.invoke('prefs:set', key, value),
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
    loginUrl: (url: string) => ipcRenderer.invoke('app:login-url', url),
    getCookiesFile: () => ipcRenderer.invoke('app:get-cookies-file'),
  },
})