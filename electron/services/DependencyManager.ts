import path from 'path'
import fs from 'fs'
import os from 'os'
import { spawn } from 'child_process'
import { app } from 'electron'
import { downloadFile } from './downloadFile'
import { resolveArchiveTool, tempFileExtension, ffmpegMatcher, denoMatcher, escapePowershell, getWindowsPowerShellEnvironment } from './dependencyArchives'

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
    const baseDir = app.isPackaged ? app.getPath('userData') : process.cwd()
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
    const urls = getDownloadUrls()
    const url = urls[type]
    if (!url) throw new Error(`No download URL for ${type}`)

    if (type === 'ytdlp') {
      const dest = this.getLocalYtDlpPath()
      const tmpDest = dest + '.tmp'
      await downloadFile(url, tmpDest, onProgress)
      try {
        if (fs.existsSync(dest)) {
          fs.unlinkSync(dest)
        }
      } catch {
        // Old binary may be locked; rename below will still use the temp file
      }
      try {
        fs.renameSync(tmpDest, dest)
      } catch (e) {
        throw new Error(
          `Cannot replace yt-dlp.exe — file may be locked by antivirus or another process. ` +
          `Updated binary saved to ${tmpDest}. Try closing the app and renaming it manually.`,
          { cause: e },
        )
      }
      if (!isWindows()) fs.chmodSync(dest, 0o755)
    } else if (type === 'ffmpeg') {
      const ext = tempFileExtension(url)
      const tmpFile = path.join(os.tmpdir(), `ffmpeg-${Date.now()}${ext}`)
      await downloadFile(url, tmpFile, onProgress)
      await this.extractFFmpegFromArchive(tmpFile, this.binDirectory)
      fs.unlinkSync(tmpFile)
    } else if (type === 'deno') {
      const tempZip = path.join(os.tmpdir(), `deno-${Date.now()}.zip`)
      await downloadFile(url, tempZip, onProgress)
      await this.extractFromArchiveGeneric(tempZip, this.binDirectory,
        (name) => denoMatcher(name, process.platform), isWindows() ? 'deno.exe' : 'deno')
      fs.unlinkSync(tempZip)
      if (!isWindows()) fs.chmodSync(this.getLocalDenoPath(), 0o755)
    }
  }

  private extractFFmpegFromArchive(archivePath: string, destDir: string): Promise<void> {
    return this.extractFromArchiveGeneric(archivePath, destDir, ffmpegMatcher, isWindows() ? 'ffmpeg.exe' : 'ffmpeg')
  }

  private async extractFromArchiveGeneric(
    archivePath: string,
    destDir: string,
    matcher: (name: string) => boolean,
    outName: string,
  ): Promise<void> {
    const tool = resolveArchiveTool(process.platform, archivePath)
    if (tool === 'tar') {
      await this.extractWithTar(archivePath, destDir, matcher, outName)
    } else if (tool === 'powershell') {
      await this.extractWithPowershell(archivePath, destDir, matcher, outName)
    } else if (tool === 'ditto') {
      await this.extractWithDitto(archivePath, destDir, matcher, outName)
    } else {
      await this.extractWithUnzip(archivePath, destDir, matcher, outName)
    }
  }

  private extractWithPowershell(
    archivePath: string,
    destDir: string,
    matcher: (name: string) => boolean,
    outName: string,
  ): Promise<void> {
    const tmpDir = path.join(os.tmpdir(), `hvd-extract-${Date.now()}`)
    fs.mkdirSync(tmpDir, { recursive: true })
    return new Promise<void>((resolve, reject) => {
      const escapedSrc = escapePowershell(archivePath)
      const escapedDest = escapePowershell(tmpDir)
      const stderr: Buffer[] = []
      const child = spawn('powershell', [
        '-NoProfile', '-NonInteractive', '-Command',
        `Expand-Archive -LiteralPath '${escapedSrc}' -DestinationPath '${escapedDest}' -Force`,
      ], { windowsHide: true, env: getWindowsPowerShellEnvironment(process.env) })
      child.stderr?.on('data', (chunk: Buffer) => stderr.push(chunk))
      child.on('close', (code) => {
        if (code !== 0) {
          const detail = Buffer.concat(stderr).toString('utf8').trim()
          reject(new Error(`Expand-Archive failed with code ${code}${detail ? `: ${detail}` : ''}`))
          return
        }
        try {
          const found = this.findAndMove(tmpDir, destDir, matcher, outName)
          if (!found) reject(new Error(`Could not find ${outName} in extracted archive`))
          else resolve()
        } catch (e) { reject(e) }
        finally { this.rmrf(tmpDir) }
      })
      child.on('error', reject)
    })
  }

  private extractWithDitto(
    archivePath: string,
    destDir: string,
    matcher: (name: string) => boolean,
    outName: string,
  ): Promise<void> {
    const tmpDir = path.join(os.tmpdir(), `hvd-extract-${Date.now()}`)
    fs.mkdirSync(tmpDir, { recursive: true })
    return new Promise<void>((resolve, reject) => {
      const child = spawn('ditto', ['-xk', archivePath, tmpDir])
      child.on('close', (code) => {
        if (code !== 0) { reject(new Error(`ditto failed with code ${code}`)); return }
        try {
          const found = this.findAndMove(tmpDir, destDir, matcher, outName)
          if (!found) reject(new Error(`Could not find ${outName} in extracted archive`))
          else resolve()
        } catch (e) { reject(e) }
        finally { this.rmrf(tmpDir) }
      })
      child.on('error', reject)
    })
  }

  private extractWithUnzip(
    archivePath: string,
    destDir: string,
    matcher: (name: string) => boolean,
    outName: string,
  ): Promise<void> {
    const tmpDir = path.join(os.tmpdir(), `hvd-extract-${Date.now()}`)
    fs.mkdirSync(tmpDir, { recursive: true })
    return new Promise<void>((resolve, reject) => {
      const child = spawn('unzip', ['-o', archivePath, '-d', tmpDir])
      child.on('close', (code) => {
        if (code !== 0) { reject(new Error(`unzip failed with code ${code}`)); return }
        try {
          const found = this.findAndMove(tmpDir, destDir, matcher, outName)
          if (!found) reject(new Error(`Could not find ${outName} in extracted archive`))
          else resolve()
        } catch (e) { reject(e) }
        finally { this.rmrf(tmpDir) }
      })
      child.on('error', reject)
    })
  }

  private extractWithTar(
    archivePath: string,
    destDir: string,
    matcher: (name: string) => boolean,
    outName: string,
  ): Promise<void> {
    const tmpDir = path.join(os.tmpdir(), `hvd-extract-${Date.now()}`)
    fs.mkdirSync(tmpDir, { recursive: true })
    return new Promise<void>((resolve, reject) => {
      const child = spawn('tar', ['-xJf', archivePath, '-C', tmpDir])
      child.on('close', (code) => {
        if (code !== 0) { reject(new Error(`tar failed with code ${code}`)); return }
        try {
          const found = this.findAndMove(tmpDir, destDir, matcher, outName)
          if (!found) reject(new Error(`Could not find ${outName} in extracted archive`))
          else resolve()
        } catch (e) { reject(e) }
        finally { this.rmrf(tmpDir) }
      })
      child.on('error', reject)
    })
  }

  private findAndMove(
    searchDir: string,
    destDir: string,
    matcher: (name: string) => boolean,
    outName: string,
  ): boolean {
    const walk = (dir: string): boolean => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          if (walk(full)) return true
        } else if (matcher(entry.name)) {
          const destPath = path.join(destDir, outName)
          const tmpPath = destPath + '.tmp'
          fs.copyFileSync(full, tmpPath)
          try { if (fs.existsSync(destPath)) fs.unlinkSync(destPath) } catch {
            // Existing binary may be locked; the rename below will replace it atomically
          }
          fs.renameSync(tmpPath, destPath)
          if (!isWindows()) fs.chmodSync(destPath, 0o755)
          return true
        }
      }
      return false
    }
    return walk(searchDir)
  }

  private rmrf(dir: string) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}
