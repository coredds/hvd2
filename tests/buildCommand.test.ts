import { describe, it, expect } from 'vitest'
import { buildCommand, buildYoutubeFormatString, isBestAvailable, isBestFormat } from '../electron/services/CommandBuilder'
import type { DownloadItem, DownloadOptions } from '../electron/services/CommandBuilder'

const ytUrl = 'https://www.youtube.com/watch?v=EpzDOtJpIk4'
const vimeoUrl = 'https://vimeo.com/76979871'

const baseItem: DownloadItem = { id: '1', url: ytUrl, title: 'Test', noPlaylist: true }
const baseOptions: DownloadOptions = {
  audioOnly: false,
  audioFormat: 'mp3',
  audioQuality: '192k',
  videoQuality: '1080p',
  videoFormat: 'mp4',
  videoAudioFormat: 'aac',
  outputDirectory: 'C:\\Downloads',
  embedSubtitles: false,
  embedThumbnail: true,
  addMetadata: false,
}

function findFlag(args: string[], flag: string): string | null {
  const idx = args.indexOf(flag)
  if (idx === -1) return null
  return args[idx + 1] ?? null
}

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag)
}

describe('CommandBuilder', () => {
  describe('buildCommand', () => {
    it('always includes base flags', () => {
      const args = buildCommand(baseItem, baseOptions, 'yt-dlp.exe', 'C:\\DL')
      expect(hasFlag(args, '--restrict-filenames')).toBe(true)
      expect(hasFlag(args, '--no-clean-infojson')).toBe(true)
      expect(hasFlag(args, '--newline')).toBe(true)
      expect(hasFlag(args, '--progress')).toBe(true)
    })

    it('respects output directory', () => {
      const args = buildCommand(baseItem, { ...baseOptions, outputDirectory: 'C:\\Vids' }, 'yt-dlp.exe', 'C:\\DL')
      const idx = args.indexOf('-P')
      expect(args[idx + 1]).toBe('C:\\Vids')
    })

    it('passes --no-playlist when item.noPlaylist is true', () => {
      const args = buildCommand(baseItem, baseOptions, 'yt-dlp.exe', 'C:\\DL')
      expect(hasFlag(args, '--no-playlist')).toBe(true)

      const args2 = buildCommand({ ...baseItem, noPlaylist: false }, baseOptions, 'yt-dlp.exe', 'C:\\DL')
      expect(hasFlag(args2, '--no-playlist')).toBe(false)
    })

    it('video mode uses format selection', () => {
      const args = buildCommand(baseItem, baseOptions, 'yt-dlp.exe', 'C:\\DL')
      expect(hasFlag(args, '-f')).toBe(true)
      expect(hasFlag(args, '--extract-audio')).toBe(false)
    })

    it('audio mode adds --extract-audio and audio format', () => {
      const args = buildCommand(baseItem, { ...baseOptions, audioOnly: true, audioFormat: 'opus' }, 'yt-dlp.exe', 'C:\\DL')
      expect(hasFlag(args, '--extract-audio')).toBe(true)
      expect(findFlag(args, '--audio-format')).toBe('opus')
    })

    it('audio mode passes --audio-quality', () => {
      const args = buildCommand(baseItem, { ...baseOptions, audioOnly: true, audioQuality: '320k' }, 'yt-dlp.exe', 'C:\\DL')
      expect(findFlag(args, '--audio-quality')).toBe('320k')
    })

    it('YouTube video uses simple format without ext filter', () => {
      const args = buildCommand(baseItem, { ...baseOptions, videoQuality: '720p' }, 'yt-dlp.exe', 'C:\\DL')
      const fmt = findFlag(args, '-f')
      expect(fmt).toContain('720')
      expect(fmt).not.toContain('ext=')
    })

    it('YouTube best quality uses simple format', () => {
      const args = buildCommand(baseItem, { ...baseOptions, videoQuality: 'Best Available' }, 'yt-dlp.exe', 'C:\\DL')
      expect(findFlag(args, '-f')).toBe('bestvideo+bestaudio/best')
    })

    it('non-YouTube uses ext filter in format', () => {
      const args = buildCommand(
        { ...baseItem, url: vimeoUrl },
        { ...baseOptions, videoQuality: '1080p', videoFormat: 'mp4' },
        'yt-dlp.exe', 'C:\\DL',
      )
      const fmt = findFlag(args, '-f')
      expect(fmt).toContain('ext=mp4')
      expect(fmt).toContain('1080')
    })

    it('non-YouTube adds --merge-output-format for specific format', () => {
      const args = buildCommand(
        { ...baseItem, url: vimeoUrl },
        { ...baseOptions, videoQuality: '1080p', videoFormat: 'mp4' },
        'yt-dlp.exe', 'C:\\DL',
      )
      expect(hasFlag(args, '--merge-output-format')).toBe(true)
    })

    it('thumbnail embedding adds write/embed/convert flags', () => {
      const args = buildCommand(baseItem, { ...baseOptions, embedThumbnail: true }, 'yt-dlp.exe', 'C:\\DL')
      expect(hasFlag(args, '--write-thumbnail')).toBe(true)
      expect(hasFlag(args, '--embed-thumbnail')).toBe(true)
      expect(findFlag(args, '--convert-thumbnails')).toBe('jpg')
    })

    it('thumbnail forces mp4 for video regardless of format', () => {
      const args = buildCommand(
        { ...baseItem, url: vimeoUrl },
        { ...baseOptions, videoFormat: 'mp4', embedThumbnail: true },
        'yt-dlp.exe', 'C:\\DL',
      )
      // Always adds --merge-output-format mp4 when embedding thumbnail
      const mergeFlags = args.filter(a => a === '--merge-output-format')
      expect(mergeFlags.length).toBe(2)
    })

    it('subtitles add --write-subs and --embed-subs', () => {
      const args = buildCommand(baseItem, { ...baseOptions, embedSubtitles: true }, 'yt-dlp.exe', 'C:\\DL')
      expect(hasFlag(args, '--write-subs')).toBe(true)
      expect(hasFlag(args, '--embed-subs')).toBe(true)
    })

    it('adds --add-metadata', () => {
      const args = buildCommand(baseItem, { ...baseOptions, addMetadata: true }, 'yt-dlp.exe', 'C:\\DL')
      expect(hasFlag(args, '--add-metadata')).toBe(true)
    })

    it('passes --cookies when cookiesFile is set', () => {
      const args = buildCommand(baseItem, { ...baseOptions, cookiesFile: 'C:\\tmp\\cookies.txt' }, 'yt-dlp.exe', 'C:\\DL')
      expect(findFlag(args, '--cookies')).toBe('C:\\tmp\\cookies.txt')
    })

    it('audio-only YouTube adds bestaudio format', () => {
      const args = buildCommand(baseItem, { ...baseOptions, audioOnly: true }, 'yt-dlp.exe', 'C:\\DL')
      const fmt = findFlag(args, '-f')
      expect(fmt).toBe('bestaudio/best')
    })

    it('video audio format for non-YouTube', () => {
      const args = buildCommand(
        { ...baseItem, url: vimeoUrl },
        { ...baseOptions, videoAudioFormat: 'opus' },
        'yt-dlp.exe', 'C:\\DL',
      )
      expect(findFlag(args, '--audio-format')).toBe('opus')
    })

    it('URL is always last arg', () => {
      const args = buildCommand(baseItem, baseOptions, 'yt-dlp.exe', 'C:\\DL')
      expect(args[args.length - 1]).toBe(ytUrl)
    })
  })

  describe('buildYoutubeFormatString', () => {
    it('returns best for best available', () => {
      expect(buildYoutubeFormatString('Best Available')).toBe('bestvideo+bestaudio/best')
    })

    it('returns worst for worst available', () => {
      expect(buildYoutubeFormatString('Worst Available')).toBe('worst')
    })

    it('returns height-filtered format', () => {
      const result = buildYoutubeFormatString('1080p')
      expect(result).toContain('1080')
      expect(result).not.toContain('ext=')
    })

    it('recognizes i18n quality strings', () => {
      expect(buildYoutubeFormatString('Melhor Disponivel')).toBe('bestvideo+bestaudio/best')
      expect(buildYoutubeFormatString('最高品質')).toBe('bestvideo+bestaudio/best')
    })
  })

  describe('isBestAvailable', () => {
    it('matches all translations', () => {
      expect(isBestAvailable('Best Available')).toBe(true)
      expect(isBestAvailable('Melhor Disponivel')).toBe(true)
      expect(isBestAvailable('Mejor Disponible')).toBe(true)
      expect(isBestAvailable('Migliore Disponibile')).toBe(true)
      expect(isBestAvailable('最高品質')).toBe(true)
      expect(isBestAvailable('Beste verfugbar')).toBe(true)
      expect(isBestAvailable('1080p')).toBe(false)
    })
  })
})