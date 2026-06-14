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

const ffmpegPath = 'C:\\Users\\test\\bin\\ffmpeg.exe'

function build(item: DownloadItem = baseItem, options: Partial<DownloadOptions> = {}): string[] {
  return buildCommand(item, { ...baseOptions, ...options }, ffmpegPath, 'C:\\DL')
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
      const args = build()
      expect(hasFlag(args, '--restrict-filenames')).toBe(true)
      expect(hasFlag(args, '--no-clean-infojson')).toBe(true)
      expect(hasFlag(args, '--newline')).toBe(true)
      expect(hasFlag(args, '--progress')).toBe(true)
    })

    it('includes ffmpeg-location', () => {
      const args = build()
      expect(findFlag(args, '--ffmpeg-location')).toBe(ffmpegPath)
    })

    it('respects output directory', () => {
      const args = build(baseItem, { outputDirectory: 'C:\\Vids' })
      const idx = args.indexOf('-P')
      expect(args[idx + 1]).toBe('C:\\Vids')
    })

    it('passes --no-playlist when item.noPlaylist is true', () => {
      const args = build()
      expect(hasFlag(args, '--no-playlist')).toBe(true)

      const args2 = build({ ...baseItem, noPlaylist: false })
      expect(hasFlag(args2, '--no-playlist')).toBe(false)
    })

    it('video mode uses format selection', () => {
      const args = build()
      expect(hasFlag(args, '-f')).toBe(true)
      expect(hasFlag(args, '--extract-audio')).toBe(false)
    })

    it('audio mode adds --extract-audio and audio format', () => {
      const args = build(baseItem, { audioOnly: true, audioFormat: 'opus' })
      expect(hasFlag(args, '--extract-audio')).toBe(true)
      expect(findFlag(args, '--audio-format')).toBe('opus')
    })

    it('audio mode passes --audio-quality', () => {
      const args = build(baseItem, { audioOnly: true, audioQuality: '320k' })
      expect(findFlag(args, '--audio-quality')).toBe('320k')
    })

    it('YouTube video uses simple format without ext filter', () => {
      const args = build(baseItem, { videoQuality: '720p' })
      const fmt = findFlag(args, '-f')
      expect(fmt).toContain('720')
      expect(fmt).not.toContain('ext=')
    })

    it('YouTube best quality uses simple format', () => {
      const args = build(baseItem, { videoQuality: 'Best Available' })
      expect(findFlag(args, '-f')).toBe('bestvideo+bestaudio/best')
    })

    it('non-YouTube uses ext filter in format', () => {
      const args = build({ ...baseItem, url: vimeoUrl }, { videoQuality: '1080p', videoFormat: 'mp4' })
      const fmt = findFlag(args, '-f')
      expect(fmt).toContain('ext=mp4')
      expect(fmt).toContain('1080')
    })

    it('non-YouTube adds --merge-output-format for specific format', () => {
      const args = build({ ...baseItem, url: vimeoUrl }, { videoQuality: '1080p', videoFormat: 'mp4' })
      expect(hasFlag(args, '--merge-output-format')).toBe(true)
    })

    it('thumbnail embedding adds write/embed/convert flags', () => {
      const args = build(baseItem, { embedThumbnail: true })
      expect(hasFlag(args, '--write-thumbnail')).toBe(true)
      expect(hasFlag(args, '--embed-thumbnail')).toBe(true)
      expect(findFlag(args, '--convert-thumbnails')).toBe('jpg')
    })

    it('thumbnail forces mp4 for video regardless of format', () => {
      const args = build({ ...baseItem, url: vimeoUrl }, { videoFormat: 'mp4', embedThumbnail: true })
      // Always adds --merge-output-format mp4 when embedding thumbnail
      const mergeFlags = args.filter(a => a === '--merge-output-format')
      expect(mergeFlags.length).toBe(2)
    })

    it('subtitles add --write-subs and --embed-subs', () => {
      const args = build(baseItem, { embedSubtitles: true })
      expect(hasFlag(args, '--write-subs')).toBe(true)
      expect(hasFlag(args, '--embed-subs')).toBe(true)
    })

    it('adds --add-metadata', () => {
      const args = build(baseItem, { addMetadata: true })
      expect(hasFlag(args, '--add-metadata')).toBe(true)
    })

    it('passes --cookies when cookiesFile is set', () => {
      const args = build(baseItem, { cookiesFile: 'C:\\tmp\\cookies.txt' })
      expect(findFlag(args, '--cookies')).toBe('C:\\tmp\\cookies.txt')
    })

    it('audio-only YouTube adds bestaudio format', () => {
      const args = build(baseItem, { audioOnly: true })
      const fmt = findFlag(args, '-f')
      expect(fmt).toBe('bestaudio/best')
    })

    it('video audio format for non-YouTube', () => {
      const args = build({ ...baseItem, url: vimeoUrl }, { videoAudioFormat: 'opus' })
      expect(findFlag(args, '--audio-format')).toBe('opus')
    })

    it('URL is always last arg', () => {
      const args = build()
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