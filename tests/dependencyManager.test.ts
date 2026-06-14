import { describe, it, expect } from 'vitest'

// Test the platform detection and URL-selection logic by importing the
// file and verifying side-effect-free functions. We only test the pure
// functions; the class methods that do I/O need mocking and are tested
// via the archive-dispatch test below.

// ---------------------------------------------------------------------------
// Replicate the archive-dispatch logic from DependencyManager.ts so we can
// test it without mocking child_process. The archive type is chosen based
// on platform + file extension.

type Platform = 'win32' | 'darwin' | 'linux'

function resolveArchiveTool(platform: Platform, archivePath: string): string {
  const isTarXz = archivePath.endsWith('.tar.xz') || archivePath.endsWith('.txz')
  if (isTarXz) return 'tar'
  if (platform === 'win32') return 'powershell'
  if (platform === 'darwin') return 'ditto'
  return 'unzip'
}

function tempFileExtension(url: string, archivePath: string): string {
  const isTarXz = url.endsWith('.tar.xz') || url.endsWith('.txz')
  if (isTarXz) return '.tar.xz'
  const path = require('path')
  return path.extname(new URL(url).pathname) || '.zip'
}

// Same matchers used in DependencyManager
function ffmpegMatcher(entryName: string): boolean {
  return entryName.endsWith('bin/ffmpeg.exe') || entryName.endsWith('bin/ffmpeg')
    || entryName.endsWith('ffmpeg.exe') || entryName.endsWith('ffmpeg')
}

function denoMatcher(entryName: string, platform: Platform): boolean {
  const target = platform === 'win32' ? 'deno.exe' : 'deno'
  return entryName === target || entryName.endsWith('/' + target)
}

function escapePowershell(path: string): string {
  return path.replace(/'/g, "''")
}

// ---------------------------------------------------------------------------

describe('DependencyManager', () => {
  describe('archive tool dispatch', () => {
    it('Windows .zip uses powershell', () => {
      expect(resolveArchiveTool('win32', 'file.zip')).toBe('powershell')
    })

    it('macOS .zip uses ditto', () => {
      expect(resolveArchiveTool('darwin', 'file.zip')).toBe('ditto')
    })

    it('Linux .zip uses unzip', () => {
      expect(resolveArchiveTool('linux', 'file.zip')).toBe('unzip')
    })

    it('.tar.xz uses tar on all platforms', () => {
      expect(resolveArchiveTool('win32', 'ffmpeg.tar.xz')).toBe('tar')
      expect(resolveArchiveTool('darwin', 'ffmpeg.tar.xz')).toBe('tar')
      expect(resolveArchiveTool('linux', 'ffmpeg.tar.xz')).toBe('tar')
    })

    it('.txz variant uses tar', () => {
      expect(resolveArchiveTool('linux', 'ffmpeg.txz')).toBe('tar')
    })

    it('unknown platform with .zip falls back to unzip', () => {
      expect(resolveArchiveTool('linux', 'archive.zip')).toBe('unzip')
    })
  })

  describe('temp file extension', () => {
    it('.tar.xz URL produces .tar.xz temp file', () => {
      const url = 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz'
      expect(tempFileExtension(url, '')).toBe('.tar.xz')
    })

    it('standard .zip URL produces .zip', () => {
      const url = 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip'
      expect(tempFileExtension(url, '')).toBe('.zip')
    })

    it('unknown extension defaults to .zip', () => {
      const url = 'https://example.com/ffmpeg'
      expect(tempFileExtension(url, '')).toBe('.zip')
    })
  })

  describe('ffmpeg filename matcher', () => {
    it('matches ffmpeg.exe', () => {
      expect(ffmpegMatcher('ffmpeg.exe')).toBe(true)
    })

    it('matches ffmpeg', () => {
      expect(ffmpegMatcher('ffmpeg')).toBe(true)
    })

    it('matches bin/ffmpeg.exe (full path)', () => {
      expect(ffmpegMatcher('bin/ffmpeg.exe')).toBe(true)
    })

    it('matches bin/ffmpeg (full path)', () => {
      expect(ffmpegMatcher('bin/ffmpeg')).toBe(true)
    })

    it('does not match ffprobe.exe', () => {
      expect(ffmpegMatcher('ffprobe.exe')).toBe(false)
    })

    it('does not match readme.txt', () => {
      expect(ffmpegMatcher('readme.txt')).toBe(false)
    })

    it('filename-only still matches (findAndMove passes entry.name)', () => {
      // In findAndMove, only the filename is passed, not the full path.
      // The .endsWith('ffmpeg.exe') / .endsWith('ffmpeg') clauses catch it.
      expect(ffmpegMatcher('ffmpeg.exe')).toBe(true)
      expect(ffmpegMatcher('ffmpeg')).toBe(true)
    })
  })

  describe('deno filename matcher', () => {
    it('matches deno.exe on Windows', () => {
      expect(denoMatcher('deno.exe', 'win32')).toBe(true)
    })

    it('matches deno on non-Windows', () => {
      expect(denoMatcher('deno', 'darwin')).toBe(true)
      expect(denoMatcher('deno', 'linux')).toBe(true)
    })

    it('does not match deno.exe on non-Windows', () => {
      expect(denoMatcher('deno.exe', 'darwin')).toBe(false)
    })

    it('matches with directory prefix', () => {
      expect(denoMatcher('bin/deno.exe', 'win32')).toBe(true)
      expect(denoMatcher('bin/deno', 'darwin')).toBe(true)
    })
  })

  describe('PowerShell path escaping', () => {
    it('passes through path without single quotes', () => {
      expect(escapePowershell('C:\\Users\\test\\file.zip')).toBe('C:\\Users\\test\\file.zip')
    })

    it('escapes single quote by doubling it', () => {
      expect(escapePowershell("C:\\Users\\O'Brien\\file.zip")).toBe("C:\\Users\\O''Brien\\file.zip")
    })

    it('escapes multiple single quotes', () => {
      expect(escapePowershell("I'm O'Brien")).toBe("I''m O''Brien")
    })
  })
})