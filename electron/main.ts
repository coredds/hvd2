import { app, BrowserWindow, ipcMain, dialog, shell, Menu, screen } from 'electron'
import path from 'path'
import { spawn } from 'child_process'
import fs from 'fs'
import { YtDlpService } from './services/YtDlpService'
import { DependencyManager } from './services/DependencyManager'
import { PreferencesService } from './services/PreferencesService'
import { resolveBrowserExecutable } from './services/BrowserLauncher'
import type { DownloadItem, DownloadOptions } from '../src/types'

let win: BrowserWindow | null = null
let ytDlp: YtDlpService
let deps: DependencyManager
let prefs: PreferencesService

const isDev = !app.isPackaged

function createWindow() {
  const savedBounds = prefs.get('window.bounds', null)
  const wasMaximized = prefs.get('window.isMaximized', false)

  const windowOpts: Electron.BrowserWindowConstructorOptions = {
    width: savedBounds?.width ?? 1100,
    height: savedBounds?.height ?? 900,
    minWidth: 900,
    minHeight: 700,
    icon: path.join(__dirname, '../resources/icons/256.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: true,
    },
  }

  if (savedBounds && savedBounds.x !== undefined && savedBounds.y !== undefined) {
    const bounds = { x: savedBounds.x, y: savedBounds.y, width: savedBounds.width, height: savedBounds.height }
    if (isBoundsVisibleOnAnyDisplay(bounds)) {
      windowOpts.x = bounds.x
      windowOpts.y = bounds.y
    }
  }

  win = new BrowserWindow(windowOpts)

  if (wasMaximized && win) {
    win.maximize()
  }

  win.on('close', () => {
    if (win) {
      const isMaximized = win.isMaximized()
      const bounds = isMaximized ? win.getNormalBounds() : win.getBounds()
      prefs.set('window.bounds', { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height })
      prefs.set('window.isMaximized', isMaximized)
      prefs.save()
    }
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

function isBoundsVisibleOnAnyDisplay(bounds: { x: number; y: number; width: number; height: number }): boolean {
  for (const display of screen.getAllDisplays()) {
    const { x, y, width, height } = display.workArea
    if (bounds.x < x + width && bounds.x + bounds.width > x &&
        bounds.y < y + height && bounds.y + bounds.height > y) {
      return true
    }
  }
  return false
}

// ─── IPC: Downloads ────────────────────────────────────────────

ipcMain.handle('download:start', async (_event, item: DownloadItem, options: DownloadOptions) => {
  ytDlp.startDownload(item, options)
})

ipcMain.handle('download:cancel', async (_event, id: string) => {
  ytDlp.cancelDownload(id)
})

ipcMain.handle('download:extract-title', async (_event, url: string, browser?: string) => {
  return ytDlp.extractTitle(url, browser)
})

// ─── IPC: Dependencies ──────────────────────────────────────────

ipcMain.handle('deps:check-ytdlp', async () => {
  const available = await ytDlp.isAvailable()
  let version: string | undefined
  let isRecent: boolean | undefined
  if (available) {
    version = await ytDlp.getVersion()
    isRecent = await ytDlp.isVersionRecent()
  }
  return { available, version, isRecent }
})

ipcMain.handle('deps:check-ffmpeg', async () => {
  return ytDlp.isFFmpegAvailable()
})

ipcMain.handle('deps:check-deno', async () => {
  return ytDlp.isDenoAvailable()
})

ipcMain.handle('deps:download-ytdlp', async () => {
  await deps.download('ytdlp', () => {})
})

ipcMain.handle('deps:update-ytdlp-self', async () => {
  return ytDlp.updateSelf()
})

ipcMain.handle('deps:download-ffmpeg', async () => {
  await deps.download('ffmpeg', () => {})
})

ipcMain.handle('deps:download-deno', async () => {
  await deps.download('deno', () => {})
})

ipcMain.handle('deps:open-folder', async (_event, _type: string) => {
  shell.openPath(deps.getBinDirectory())
})

ipcMain.handle('deps:get-ytdlp-version', async () => {
  return ytDlp.getVersion()
})

ipcMain.handle('deps:get-ytdlp-latest-version', async () => {
  return ytDlp.getLatestVersion()
})

// ─── IPC: Preferences ───────────────────────────────────────────

ipcMain.handle('prefs:get', async (_event, key: string) => {
  return prefs.get(key)
})

ipcMain.handle('prefs:set', async (_event, key: string, value: unknown) => {
  prefs.set(key, value)
  prefs.save()
})

ipcMain.handle('prefs:getAll', async () => {
  return prefs.getAll()
})

// ─── IPC: Dialog ────────────────────────────────────────────────

ipcMain.handle('dialog:open-folder', async () => {
  console.log('[main] dialog:open-folder called, win:', !!win)
  if (!win) return null
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory'],
  })
  console.log('[main] dialog result:', result.canceled, result.filePaths)
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('dialog:alert', async (_event, opts: { title: string; message: string; type?: string; buttons?: string[] }) => {
  if (!win) return -1
  const result = await dialog.showMessageBox(win, {
    title: opts.title,
    message: opts.message,
    type: (opts.type as Electron.MessageBoxOptions['type']) || 'info',
    buttons: opts.buttons || ['OK'],
    defaultId: 0,
  })
  return result.response
})

// ─── IPC: App ────────────────────────────────────────────────────

ipcMain.handle('app:get-locale', async () => {
  return app.getLocale()
})

ipcMain.handle('app:open-path', async (_event, filePath: string) => {
  shell.openPath(filePath)
})

ipcMain.handle('app:restart', async () => {
  app.relaunch()
  app.exit(0)
})

ipcMain.handle('app:get-version', async () => {
  return app.getVersion()
})

ipcMain.handle('app:open-provider', async (_event, url: string, source: string) => {
  const exe = resolveBrowserExecutable(source, process.platform, fs.existsSync, process.env)
  if (exe) {
    try {
      const child = spawn(exe, [url], { detached: true, stdio: 'ignore' })
      child.on('error', () => {
        void shell.openExternal(url)
      })
      child.unref()
      return true
    } catch {
      // Fall back to the system browser if the selected executable cannot launch
    }
  }
  await shell.openExternal(url)
  return true
})

ipcMain.handle('auth:test-cookies', async (_event, source: string) => {
  return ytDlp.testBrowserCookies(source)
})

// ─── IPC: YouTube Authentication ─────────────────────────────────

ipcMain.handle('app:login-url', async (_event, url: string, _title?: string) => {
  await shell.openExternal(url)
  return true
})

// ─── Shutdown ────────────────────────────────────────────────────

function shutdown() {
  ytDlp.cancelAll()
  prefs.save()
}

app.on('before-quit', shutdown)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.whenReady().then(() => {
  ytDlp = new YtDlpService()
  deps = new DependencyManager()
  prefs = new PreferencesService()
  Menu.setApplicationMenu(null)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})