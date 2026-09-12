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
    offProgress: (cb: any) =>
      ipcRenderer.removeListener('download:progress', cb),
    onLog: (cb: any) =>
      ipcRenderer.on('download:log', cb),
    offLog: (cb: any) =>
      ipcRenderer.removeListener('download:log', cb),
    onStatus: (cb: any) =>
      ipcRenderer.on('download:status', cb),
    offStatus: (cb: any) =>
      ipcRenderer.removeListener('download:status', cb),
    onComplete: (cb: any) =>
      ipcRenderer.on('download:complete', cb),
    offComplete: (cb: any) =>
      ipcRenderer.removeListener('download:complete', cb),
    onError: (cb: any) =>
      ipcRenderer.on('download:error', cb),
    offError: (cb: any) =>
      ipcRenderer.removeListener('download:error', cb),
    onPaused: (cb: any) =>
      ipcRenderer.on('download:paused', cb),
    offPaused: (cb: any) =>
      ipcRenderer.removeListener('download:paused', cb),
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
    openProvider: (url: string, source: string) => ipcRenderer.invoke('app:open-provider', url, source),
    getVersion: () => ipcRenderer.invoke('app:get-version'),
  },
})