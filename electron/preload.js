const { contextBridge, ipcRenderer } = require('electron')

console.log('[preload] executing, exposing electronAPI...')

contextBridge.exposeInMainWorld('electronAPI', {
  downloads: {
    start: (item, options) => ipcRenderer.invoke('download:start', item, options),
    cancel: (id) => ipcRenderer.invoke('download:cancel', id),
    extractTitle: (url, browser) => ipcRenderer.invoke('download:extract-title', url, browser),
    onProgress: (cb) => ipcRenderer.on('download:progress', cb),
    onLog: (cb) => ipcRenderer.on('download:log', cb),
    onStatus: (cb) => ipcRenderer.on('download:status', cb),
    onComplete: (cb) => ipcRenderer.on('download:complete', cb),
    onError: (cb) => ipcRenderer.on('download:error', cb),
    onPaused: (cb) => ipcRenderer.on('download:paused', cb),
  },
  deps: {
    checkYtDlp: () => ipcRenderer.invoke('deps:check-ytdlp'),
    checkFFmpeg: () => ipcRenderer.invoke('deps:check-ffmpeg'),
    checkDeno: () => ipcRenderer.invoke('deps:check-deno'),
    downloadYtDlp: () => ipcRenderer.invoke('deps:download-ytdlp'),
    downloadFFmpeg: () => ipcRenderer.invoke('deps:download-ffmpeg'),
    downloadDeno: () => ipcRenderer.invoke('deps:download-deno'),
    openFolder: (type) => ipcRenderer.invoke('deps:open-folder', type),
    getYtDlpVersion: () => ipcRenderer.invoke('deps:get-ytdlp-version'),
  },
  prefs: {
    get: (key) => ipcRenderer.invoke('prefs:get', key),
    set: (key, value) => ipcRenderer.invoke('prefs:set', key, value),
    getAll: () => ipcRenderer.invoke('prefs:getAll'),
  },
  dialog: {
    openFolder: () => ipcRenderer.invoke('dialog:open-folder'),
    showAlert: (opts) => ipcRenderer.invoke('dialog:alert', opts),
  },
  app: {
    getLocale: () => ipcRenderer.invoke('app:get-locale'),
    openPath: (path) => ipcRenderer.invoke('app:open-path', path),
    restart: () => ipcRenderer.invoke('app:restart'),
    loginUrl: (url) => ipcRenderer.invoke('app:login-url', url),
    getCookiesFile: () => ipcRenderer.invoke('app:get-cookies-file'),
  },
})