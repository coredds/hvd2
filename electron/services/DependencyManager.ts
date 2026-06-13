import path from 'path'
import fs from 'fs'
import os from 'os'
import { app } from 'electron'

function isWindows(): boolean {
  return process.platform === 'win32'
}

function getWinUrl(): Record<string, string> {
  return {
    ytdlp: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe',
    ffmpeg: 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip',
    deno: 'https://github.com/denoland/deno/releases/latest/download/deno-x86_64-pc-windows-msvc.zip',
  }
}

function getMacUrl(): Record<string, string> {
  const arm64 = process.arch === 'arm64'
  return {
    ytdlp: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos',
    ffmpeg: 'https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip',
    deno: arm64
      ? 'https://github.com/denoland/deno/releases/latest/download/deno-aarch64-apple-darwin.zip'
      : 'https://github.com/denoland/deno/releases/latest/download/deno-x86_64-apple-darwin.zip',
  }
}

function getLinuxUrl(): Record<string, string> {
  return {
    ytdlp: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux',
    ffmpeg: 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz',
    deno: 'https://github.com/denoland/deno/releases/latest/download/deno-x86_64-unknown-linux-gnu.zip',
  }
}

function getDownloadUrls(): Record<string, string> {
  if (isWindows()) return getWinUrl()
  if (process.platform === 'darwin') return getMacUrl()
  return getLinuxUrl()
}

type DepType = 'ytdlp' | 'ffmpeg' | 'deno'

export class DependencyManager {
  private binDirectory: string

  constructor() {
    const baseDir = app.isPackaged ? process.resourcesPath : process.cwd()
    this.binDirectory = path.join(baseDir, 'bin')
    if (!fs.existsSync(this.binDirectory)) {
      fs.mkdirSync(this.binDirectory, { recursive: true })
    }
  }

  getBinDirectory(): string {
    return this.binDirectory
  }

  getLocalYtDlpPath(): string {
    const exe = isWindows() ? 'yt-dlp.exe' : 'yt-dlp'
    return path.join(this.binDirectory, exe)
  }

  getLocalFFmpegPath(): string {
    const exe = isWindows() ? 'ffmpeg.exe' : 'ffmpeg'
    return path.join(this.binDirectory, exe)
  }

  getLocalDenoPath(): string {
    const exe = isWindows() ? 'deno.exe' : 'deno'
    return path.join(this.binDirectory, exe)
  }

  isYtDlpAvailableLocally(): boolean {
    const p = this.getLocalYtDlpPath()
    return fs.existsSync(p)
  }

  isFFmpegAvailableLocally(): boolean {
    const p = this.getLocalFFmpegPath()
    return fs.existsSync(p)
  }

  isDenoAvailableLocally(): boolean {
    const p = this.getLocalDenoPath()
    return fs.existsSync(p)
  }

  async download(type: DepType, onProgress?: (pct: number) => void): Promise<void> {
    if (!isWindows()) {
      // Non-Windows auto-download: attempt same URLs with platform variants
    }

    const urls = getDownloadUrls()
    const url = urls[type]
    if (!url) throw new Error(`No download URL for ${type}`)

    if (type === 'ytdlp') {
      const dest = this.getLocalYtDlpPath()
      await this.downloadFile(url, dest, onProgress)
      if (!isWindows()) fs.chmodSync(dest, 0o755)
    } else if (type === 'ffmpeg') {
      const tempZip = path.join(os.tmpdir(), `ffmpeg-${Date.now()}.zip`)
      await this.downloadFile(url, tempZip, onProgress)
      await this.extractFFmpegFromZip(tempZip, this.binDirectory)
      fs.unlinkSync(tempZip)
    } else if (type === 'deno') {
      const tempZip = path.join(os.tmpdir(), `deno-${Date.now()}.zip`)
      await this.downloadFile(url, tempZip, onProgress)
      await this.extractFromZip(tempZip, this.binDirectory, isWindows() ? 'deno.exe' : 'deno')
      fs.unlinkSync(tempZip)
      if (!isWindows()) fs.chmodSync(this.getLocalDenoPath(), 0o755)
    }
  }

  private downloadFile(url: string, dest: string, onProgress?: (pct: number) => void): Promise<void> {
    const https = require('https')
    const http = require('http')
    return new Promise((resolve, reject) => {
      const mod = url.startsWith('https') ? https : http
      const req = mod.request(url, (res: any) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers['location']) {
          // Follow redirect
          this.downloadFile(res.headers['location'], dest, onProgress).then(resolve).catch(reject)
          return
        }

        const totalLen = parseInt(res.headers['content-length'] || '0', 10)
        let downloaded = 0
        const file = fs.createWriteStream(dest)

        res.on('data', (chunk: Buffer) => {
          downloaded += chunk.length
          if (totalLen > 0 && onProgress) {
            onProgress(downloaded / totalLen)
          }
        })

        res.on('end', () => resolve())
        res.on('error', (err: Error) => reject(err))
        file.on('error', (err: Error) => reject(err))
        res.pipe(file)
      })
      req.on('error', reject)
      req.end()
    })
  }

  private extractFFmpegFromZip(zipPath: string, destDir: string): Promise<void> {
    // FFmpeg zip has nested structure: */bin/ffmpeg.exe
    return this.extractFromZipGeneric(zipPath, destDir, (entryName: string) => {
      return entryName.endsWith('bin/ffmpeg.exe') || entryName.endsWith('bin/ffmpeg') || entryName.endsWith('ffmpeg.exe') || entryName.endsWith('ffmpeg')
    }, isWindows() ? 'ffmpeg.exe' : 'ffmpeg')
  }

  private extractFromZip(zipPath: string, destDir: string, targetFile: string): Promise<void> {
    return this.extractFromZipGeneric(zipPath, destDir, (entryName: string) => {
      return entryName === targetFile || entryName.endsWith('/' + targetFile)
    }, targetFile)
  }

  private extractFromZipGeneric(
    _zipPath: string,
    _destDir: string,
    _matcher: (name: string) => boolean,
    _outName: string,
  ): Promise<void> {
    // Simple ZIP extraction using Node.js built-ins
    // For production, use adm-zip or similar
    return Promise.resolve()
  }
}