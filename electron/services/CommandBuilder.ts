export interface DownloadItem {
  id: string
  url: string
  title: string
  noPlaylist: boolean
}

export interface DownloadOptions {
  audioOnly: boolean
  audioFormat: string
  audioQuality: string
  videoQuality: string
  videoFormat: string
  videoAudioFormat: string
  outputDirectory: string
  embedSubtitles: boolean
  embedThumbnail: boolean
  addMetadata: boolean
  cookiesFile?: string | null
}

export function buildCommand(
  item: DownloadItem,
  options: DownloadOptions,
  ffmpegPath: string,
  defaultOutputDir: string,
): string[] {
  const isYoutube = item.url.includes('youtube.com') || item.url.includes('youtu.be')
  const args: string[] = [
    '--ffmpeg-location', ffmpegPath,
    '-P', options.outputDirectory || defaultOutputDir,
    '-o', '%(title).200B [%(id)s].%(ext)s',
    '--restrict-filenames',
    '--no-clean-infojson',
  ]

  if (options.audioOnly) {
    args.push('--extract-audio')
    if (options.audioFormat) args.push('--audio-format', options.audioFormat)
    if (options.audioQuality && options.audioQuality !== 'best') {
      args.push('--audio-quality', options.audioQuality)
    }
    if (isYoutube) {
      args.push('-f', 'bestaudio/best')
    }
  } else {
    if (isYoutube) {
      args.push('-f', buildYoutubeFormatString(options.videoQuality))
    } else {
      args.push('-f', buildVideoFormatString(options.videoQuality, options.videoFormat))
    }
    if (!isBestFormat(options.videoFormat) && !isYoutube) {
      args.push('--merge-output-format', options.videoFormat)
    }
    if (options.videoAudioFormat && !isBestFormat(options.videoAudioFormat)) {
      args.push('--audio-format', options.videoAudioFormat)
    }
  }

  if (options.embedSubtitles) {
    args.push('--write-subs', '--embed-subs')
  }

if (options.embedThumbnail) {
      args.push('--write-thumbnail', '--embed-thumbnail')
      args.push('--convert-thumbnails', 'jpg')
      if (!options.audioOnly) {
        args.push('--merge-output-format', 'mp4')
      }
    }

  if (options.addMetadata) {
    args.push('--add-metadata')
  }

  args.push('--newline', '--progress')

  if (item.noPlaylist) {
    args.push('--no-playlist')
  }

  if (options.cookiesFile) {
    args.push('--cookies', options.cookiesFile)
  }

  args.push(item.url)
  return args
}

export function buildVideoFormatString(videoQuality: string, videoFormat: string): string {
  if (isBestAvailable(videoQuality) || !videoQuality) {
    if (isBestFormat(videoFormat) || !videoFormat) {
      return 'bestvideo+bestaudio/best'
    }
    return `bestvideo[ext=${videoFormat}]+bestaudio[ext=m4a]/bestvideo[ext=${videoFormat}]+bestaudio/bestvideo+bestaudio`
  }

  if (isWorstAvailable(videoQuality)) {
    if (isBestFormat(videoFormat) || !videoFormat) return 'worst'
    return `worst[ext=${videoFormat}]/worst`
  }

  const height = getHeightFromQuality(videoQuality)
  if (!height) return 'bestvideo+bestaudio/best'

  if (isBestFormat(videoFormat) || !videoFormat) {
    return `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]`
  }

  return `bestvideo[height<=${height}][ext=${videoFormat}]+bestaudio/` +
         `best[height<=${height}][ext=${videoFormat}]/` +
         `bestvideo[height<=${height}]+bestaudio`
}

export function buildYoutubeFormatString(videoQuality: string): string {
  if (isBestAvailable(videoQuality) || !videoQuality) {
    return 'bestvideo+bestaudio/best'
  }
  if (isWorstAvailable(videoQuality)) {
    return 'worst'
  }
  const height = getHeightFromQuality(videoQuality)
  if (!height) return 'bestvideo+bestaudio/best'
  return `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]`
}

function getHeightFromQuality(quality: string): string | null {
  if (quality.includes('2160')) return '2160'
  if (quality.includes('1440')) return '1440'
  if (quality.includes('1080')) return '1080'
  if (quality.includes('720')) return '720'
  if (quality.includes('480')) return '480'
  if (quality.includes('360')) return '360'
  return null
}

export function isBestAvailable(quality: string): boolean {
  return /Best Available|Melhor Disponivel|Mejor Disponible|Migliore Disponibile|最高品質|Beste verfugbar/.test(quality)
}

export function isWorstAvailable(quality: string): boolean {
  return /Worst Available|Pior Disponivel|Peor Disponible|Peggiore Disponibile|最低品質|Schlechteste verfugbar/.test(quality)
}

export function isBestFormat(format: string): boolean {
  return /Best Format|Melhor Formato|Mejor Formato|Miglior Formato|最高フォーマット|Bestes Format/.test(format)
}