import type { DownloadItem, DownloadOptions } from '../types'

export interface BuildOptionsParams {
  audioFormat: string
  audioQuality: string
  videoQuality: string
  videoFormat: string
  videoAudioFormat: string
  audioOutputDir: string
  videoOutputDir: string
  embedSubtitles: boolean
  embedThumbnailV: boolean
  embedThumbnailA: boolean
  addMetadataV: boolean
  addMetadataA: boolean
  useBrowserCookies: boolean
  browserSource: string
}

export function buildDownloadOptionsForItem(
  item: Pick<DownloadItem, 'audioOnly'>,
  params: BuildOptionsParams,
): DownloadOptions {
  const audioOnly = item.audioOnly
  return {
    audioOnly,
    audioFormat: params.audioFormat,
    audioQuality: params.audioQuality,
    videoQuality: params.videoQuality,
    videoFormat: params.videoFormat,
    videoAudioFormat: params.videoAudioFormat,
    outputDirectory: audioOnly ? params.audioOutputDir : params.videoOutputDir,
    embedSubtitles: audioOnly ? false : params.embedSubtitles,
    embedThumbnail: audioOnly ? params.embedThumbnailA : params.embedThumbnailV,
    addMetadata: audioOnly ? params.addMetadataA : params.addMetadataV,
    useBrowserCookies: params.useBrowserCookies,
    browserSource: params.browserSource,
  }
}
