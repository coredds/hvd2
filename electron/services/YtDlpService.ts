import { ChildProcess, spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import os from 'os'
import https from 'https'
import { BrowserWindow } from 'electron'
import { DependencyManager } from './DependencyManager'
import { buildCommand, buildYoutubeFormatString, isBestAvailable, isWorstAvailable, isBestFormat, normalizeBrowserSource, DownloadItem, DownloadOptions } from './CommandBuilder'
import { parseDownloadLine, TEMP_FILE_REs, THUMBNAIL_EXT_RE } from './DownloadParser'
import { stripCookieArgs, isBrowserCookieError } from './cookieFallback'

// Re-export types so tests can import from here
export type { DownloadItem, DownloadOptions }
export { buildCommand, buildYoutubeFormatString, isBestAvailable, isWorstAvailable, isBestFormat }

export class YtDlpService {
  private ytDlpPath = 'yt-dlp'
  private deps: DependencyManager
  private activeProcesses: Map<string, ChildProcess> = new Map()
  private readonly isWin = process.platform === 'win32'

  constructor() {
    this.deps = new DependencyManager()
    this.autoDetectYtDlpPath()
  }

  getDependencyManager(): DependencyManager {
    return this.deps
  }

  private spawnYtDlp(args: string[]): ChildProcess {
    return spawn(this.ytDlpPath, args, {
      env: this.buildEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })
  }

  private decodeOutput(buf: Buffer): string {
    const raw = buf.toString('utf8')
    if (!raw.includes('\uFFFD')) return raw.trim()
    return buf.toString('latin1').trim()
  }

  private autoDetectYtDlpPath() {
    if (this.deps.isYtDlpAvailableLocally()) {
      this.ytDlpPath = this.deps.getLocalYtDlpPath()
    } else {
      this.ytDlpPath = 'yt-dlp'
    }
  }

  setYtDlpPath(p: string) { this.ytDlpPath = p }
  private outputDir = path.join(os.homedir(), 'Downloads')

  setOutputDirectory(dir: string) { this.outputDir = dir }

  async isAvailable(): Promise<boolean> {
    this.autoDetectYtDlpPath()
    console.log('[YtDlpService] checking availability at:', this.ytDlpPath)
    if (await this.isAvailableAtPath(this.ytDlpPath)) return true

    if (this.ytDlpPath === 'yt-dlp') {
      const detected = await this.detectYtDlpPath()
      if (detected) {
        this.ytDlpPath = detected
        return true
      }
    }
    return false
  }

  async isFFmpegAvailable(): Promise<boolean> {
    return this.deps.isFFmpegAvailableLocally()
  }

  async isDenoAvailable(): Promise<boolean> {
    return this.deps.isDenoAvailableLocally()
  }

  async getVersion(): Promise<string> {
    try {
      const child = this.spawnYtDlp(['--version'])
      const buf: Buffer[] = []
      child.stdout!.on('data', (d) => buf.push(d))
      return new Promise((resolve) => {
        child.on('close', () => {
          resolve(this.decodeOutput(Buffer.concat(buf)) || 'unknown')
        })
        child.on('error', () => resolve('unknown'))
      })
    } catch {
      return 'unknown'
    }
  }

  async getLatestVersion(): Promise<string | null> {
    return new Promise((resolve) => {
      const req = https.get(
        'https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest',
        { headers: { 'User-Agent': 'HVD-Video-Downloader', Accept: 'application/vnd.github+json' } },
        (res) => {
          if (res.statusCode !== 200) { resolve(null); return }
          const chunks: Buffer[] = []
          res.on('data', (d) => chunks.push(d))
          res.on('end', () => {
            try {
              const data = JSON.parse(Buffer.concat(chunks).toString('utf8'))
              const tag = data.tag_name as string
              resolve(tag || null)
            } catch { resolve(null) }
          })
        },
      )
      req.on('error', () => resolve(null))
      req.setTimeout(10000, () => { req.destroy(); resolve(null) })
    })
  }

  async isVersionRecent(): Promise<boolean> {
    const version = await this.getVersion()
    if (version === 'unknown') return true
    const latest = await this.getLatestVersion()
    if (!latest) {
      const parts = version.split('.')
      if (parts.length < 2) return true
      const year = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10)
      if (isNaN(year) || isNaN(month)) return true
      const now = new Date()
      const versionDate = new Date(year, month - 1)
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
      return versionDate >= sixMonthsAgo
    }
    return version === latest || this.compareVersions(version, latest) >= 0
  }

  private compareVersions(a: string, b: string): number {
    const parse = (v: string) => v.replace(/^v/i, '').split('.').map(Number)
    const pa = parse(a)
    const pb = parse(b)
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const da = pa[i] ?? 0
      const db = pb[i] ?? 0
      if (da > db) return 1
      if (da < db) return -1
    }
    return 0
  }

  getFFmpegPath(): string {
    return this.deps.getLocalFFmpegPath()
  }

  getDenoPath(): string {
    return this.deps.getLocalDenoPath()
  }

  // ─── yt-dlp PATH detection ──────────────────────────────────

  private async isAvailableAtPath(p: string): Promise<boolean> {
    return this.runCmd(p, ['--version'])
  }

  private async detectYtDlpPath(): Promise<string | null> {
    const isWin = process.platform === 'win32'
    const home = os.homedir()
    const paths: string[] = isWin
      ? [
          'yt-dlp.exe',
          path.join(home, 'AppData', 'Local', 'Programs', 'Python'),
          path.join(home, 'AppData', 'Roaming', 'Python'),
          'C:\\Python*\\Scripts\\yt-dlp.exe',
          'C:\\Program Files\\Python*\\Scripts\\yt-dlp.exe',
          path.join(home, 'scoop', 'apps', 'yt-dlp', 'current', 'yt-dlp.exe'),
          'C:\\ProgramData\\chocolatey\\bin\\yt-dlp.exe',
          path.join(home, 'AppData', 'Local', 'Microsoft', 'WindowsApps', 'yt-dlp.exe'),
        ]
      : [
          '/opt/homebrew/bin/yt-dlp',
          '/usr/local/bin/yt-dlp',
          path.join(home, '.pyenv', 'shims', 'yt-dlp'),
          path.join(home, '.local', 'bin', 'yt-dlp'),
          '/usr/bin/yt-dlp',
          '/bin/yt-dlp',
          '/snap/bin/yt-dlp',
        ]

    for (const p of paths) {
      if (p.includes('*')) continue
      if (await this.isAvailableAtPath(p)) return p
    }

    // Wildcard python paths (Windows)
    if (isWin) {
      for (const p of paths) {
        if (!p.includes('*')) continue
        const base = p.substring(0, p.indexOf('*'))
        const suffix = p.substring(p.lastIndexOf('*') + 1)
        const dir = path.dirname(base)
        if (!fs.existsSync(dir)) continue
        for (const entry of fs.readdirSync(dir)) {
          if (entry.startsWith('Python')) {
            const candidate = path.join(base.replace('Python*', entry), suffix)
            if (fs.existsSync(candidate) && (await this.isAvailableAtPath(candidate))) {
              return candidate
            }
          }
        }
      }
    }

    return null
  }

  private async runCmd(cmd: string, args: string[], env?: Record<string, string>): Promise<boolean> {
    return new Promise((resolve) => {
      const child = spawn(cmd, args, {
        env: env || process.env as Record<string, string>,
        stdio: ['ignore', 'ignore', 'ignore'],
      })
      child.on('close', (code) => resolve(code === 0))
      child.on('error', () => resolve(false))
    })
  }

  // ─── Self-update via yt-dlp -U ──────────────────────────────

  async updateSelf(): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve) => {
      const child = this.spawnYtDlp(['-U'])
      const stdout: Buffer[] = []
      const stderr: Buffer[] = []
      child.stdout!.on('data', (d) => stdout.push(d))
      child.stderr!.on('data', (d) => stderr.push(d))
      child.on('close', (code) => {
        const out = this.decodeOutput(Buffer.concat(stdout))
        const err = this.decodeOutput(Buffer.concat(stderr))
        if (code === 0) {
          resolve({ success: true, message: out })
        } else {
          resolve({ success: false, message: err || out || `exit code ${code}` })
        }
      })
      child.on('error', (err) => {
        resolve({ success: false, message: err.message })
      })
    })
  }

  // ─── Title extraction ───────────────────────────────────────

  async extractTitle(url: string, browserSource?: string): Promise<string> {
    const browser = browserSource ? normalizeBrowserSource(browserSource) : null
    return new Promise((resolve) => {
      const tryExtract = (args: string[]) => {
        const child = this.spawnYtDlp(args)
        const buf: Buffer[] = []
        child.stdout!.on('data', (d: Buffer) => buf.push(d))
        child.on('close', (code: number | null) => {
          const title = this.decodeOutput(Buffer.concat(buf))
          if (code === 0 && title && !title.startsWith('ERROR:')) {
            resolve(title)
          } else if (args.includes('--cookies-from-browser')) {
            tryExtract(stripCookieArgs(args))
          } else {
            resolve('Unknown Title')
          }
        })
        child.on('error', () => resolve('Unknown Title'))
      }
      const args = ['--get-title', '--no-playlist']
      if (browser) args.push('--cookies-from-browser', browser)
      args.push(url)
      tryExtract(args)
    })
  }

  // ─── Download ───────────────────────────────────────────────

  startDownload(item: DownloadItem, options: DownloadOptions): ChildProcess {
    const args = buildCommand(item, options, this.getFFmpegPath(), this.outputDir)
    console.log('[YtDlpService] starting download with yt-dlp path:', this.ytDlpPath)
    console.log('[YtDlpService] command:', this.ytDlpPath, args.join(' '))
    return this.runDownload(item, options, args, false)
  }

  private runDownload(item: DownloadItem, options: DownloadOptions, args: string[], retriedWithoutCookies: boolean): ChildProcess {
    const child = this.spawnYtDlp(args)

    // Capture stderr for error reporting
let stderrText = ''
    const stderrBuf: Buffer[] = []
    child.stderr!.on('data', (chunk: Buffer) => {
      stderrBuf.push(chunk)
    })

    this.activeProcesses.set(item.id, child)

    const allWindows = BrowserWindow.getAllWindows()
    if (allWindows.length === 0) return child
    const win = allWindows[0]

    let downloadedFilePath: string | null = null
    let finalFilePath: string | null = null
    const tempFiles: string[] = []
    let inPostProcessing = false

    const push = (channel: string, data: any) => {
      win.webContents.send(channel, data)
    }

    let buf = Buffer.alloc(0)
    child.stdout!.on('data', (chunk: Buffer) => {
      buf = Buffer.concat([buf, chunk])
      while (buf.length > 0) {
        const idx = buf.indexOf('\n'.charCodeAt(0))
        if (idx === -1) break
        let lineBuf = buf.subarray(0, idx)
        buf = buf.subarray(idx + 1)
        if (lineBuf[lineBuf.length - 1] === '\r'.charCodeAt(0)) {
          lineBuf = lineBuf.subarray(0, lineBuf.length - 1)
        }
        const line = this.decodeOutput(lineBuf)
        if (!line) continue

        // Forward to renderer log
        push('download:log', { id: item.id, line })

        const parsed = parseDownloadLine(line, inPostProcessing, options.embedThumbnail)
        if (parsed.enteredPostProcessing) {
          inPostProcessing = true
          push('download:progress', { id: item.id, progress: parsed.progress })
          push('download:status', { id: item.id, key: parsed.statusKey })
        }

        if (parsed.progress !== undefined && !parsed.enteredPostProcessing) {
          push('download:progress', { id: item.id, progress: parsed.progress })
        }

        if (parsed.destination) {
          downloadedFilePath = parsed.destination.path
          if (parsed.destination.isIntermediate) {
            tempFiles.push(parsed.destination.path)
          }
        }

        for (const thumb of parsed.thumbnails) {
          tempFiles.push(thumb)
        }

        if (parsed.finalFilePath) {
          finalFilePath = parsed.finalFilePath
          push('download:status', { id: item.id, key: 'status.merging' })
        }
      }
    })

    child.on('close', async (code) => {
      this.activeProcesses.delete(item.id)
      stderrText = this.decodeOutput(Buffer.concat(stderrBuf))

      if (code === 0) {
        const bestPath = finalFilePath || downloadedFilePath
        await this.cleanupIntermediateFiles(tempFiles, finalFilePath, options.embedThumbnail)
        push('download:complete', { id: item.id, filePath: bestPath || '' })
      } else if (!retriedWithoutCookies && args.includes('--cookies-from-browser') && isBrowserCookieError(stderrText)) {
        console.log('[YtDlpService] browser cookie extraction failed, retrying without cookies')
        push('download:log', { id: item.id, line: 'Browser cookies unavailable; retrying without authentication...' })
        this.runDownload(item, options, stripCookieArgs(args), true)
      } else {
        const errMsg = stderrText.trim()
          ? stderrText.trim().split('\n').slice(-2).join(' | ')
          : `exit code ${code}`
        push('download:error', {
          id: item.id,
          message: errMsg,
        })
      }
    })

child.on('error', (err) => {
      this.activeProcesses.delete(item.id)
      push('download:error', { id: item.id, message: `Failed to start yt-dlp: ${err.message}` })
    })

    return child
  }

  // ─── Environment ────────────────────────────────────────────

  private buildEnv(): Record<string, string> {
    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      PYTHONIOENCODING: 'utf-8',
      PYTHONUTF8: '1',
      LANG: 'en_US.UTF-8',
      LC_ALL: 'en_US.UTF-8',
    }

    const denoBinDir = path.join(os.homedir(), '.deno', 'bin')
    if (!(env.PATH || '').includes(denoBinDir)) {
      env.PATH = `${denoBinDir}${path.delimiter}${env.PATH || ''}`
    }

    return env
  }

  // ─── Process management ─────────────────────────────────────

  cancelDownload(id: string) {
    const child = this.activeProcesses.get(id)
    if (child && !child.killed) {
      child.kill()
      this.activeProcesses.delete(id)
      const allWindows = BrowserWindow.getAllWindows()
      if (allWindows.length > 0) allWindows[0].webContents.send('download:paused', { id })
    }
  }

  cancelAll() {
    for (const child of this.activeProcesses.values()) {
      if (!child.killed) child.kill()
    }
    this.activeProcesses.clear()
  }

  // ─── Temp file cleanup ──────────────────────────────────────

  private async cleanupIntermediateFiles(
    tempFiles: string[],
    finalFilePath: string | null,
    embedThumbnail: boolean,
  ) {
    for (const f of tempFiles) {
      this.deleteFileIfExists(f, finalFilePath)
    }

    if (embedThumbnail && finalFilePath) {
      this.cleanupEmbeddedThumbnail(finalFilePath)
    }

    if (finalFilePath) {
      this.cleanupAdditionalTempFiles(finalFilePath, embedThumbnail)
    }
  }

  private cleanupEmbeddedThumbnail(finalFilePath: string) {
    const lastDot = finalFilePath.lastIndexOf('.')
    if (lastDot > 0) {
      const nameWithoutExt = finalFilePath.substring(0, lastDot)
      const thumbPath = nameWithoutExt + '.jpg'
      if (fs.existsSync(thumbPath)) {
        try { fs.unlinkSync(thumbPath) } catch {
          // Thumbnail cleanup is best-effort
        }
      }
    }
  }

  private cleanupAdditionalTempFiles(finalFilePath: string, embedThumbnail: boolean) {
    try {
      const finalFile = path.basename(finalFilePath)
      const dir = path.dirname(finalFilePath)
      if (!fs.existsSync(dir)) return

      const videoIdMatch = finalFile.match(/.*\[([a-zA-Z0-9_-]+)\]\.\w+$/)
      if (!videoIdMatch) return

      const videoId = videoIdMatch[1]
      for (const entry of fs.readdirSync(dir)) {
        if (!entry.includes(videoId) || entry === finalFile) continue

        let shouldDelete = TEMP_FILE_REs.some((re) => re.test(entry))
        if (embedThumbnail && THUMBNAIL_EXT_RE.test(entry)) {
          shouldDelete = true
        }

        if (shouldDelete) {
          const fullPath = path.join(dir, entry)
          try { fs.unlinkSync(fullPath) } catch {
            // Intermediate file cleanup is best-effort
          }
        }
      }
    } catch {
      // Ignore directory read errors during cleanup
    }
  }

  private deleteFileIfExists(filePath: string, finalFilePath: string | null) {
    if (filePath === finalFilePath) return
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath) } catch {
        // Best-effort deletion
      }
    }
  }
}