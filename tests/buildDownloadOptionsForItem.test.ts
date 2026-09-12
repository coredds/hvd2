import { describe, it, expect } from 'vitest'
import { buildDownloadOptionsForItem } from '../src/lib/buildDownloadOptions'
import type { DownloadItem } from '../src/types'

const baseParams = {
  audioFormat: 'mp3',
  audioQuality: '192k',
  videoQuality: '1080p',
  videoFormat: 'mp4',
  videoAudioFormat: 'aac',
  audioOutputDir: 'C:\\Audio',
  videoOutputDir: 'C:\\Video',
  embedSubtitles: false,
  embedThumbnailV: true,
  embedThumbnailA: true,
  addMetadataV: false,
  addMetadataA: true,
  useBrowserCookies: true,
  browserSource: 'firefox',
}

describe('buildDownloadOptionsForItem', () => {
  it('selects the audio output directory for audio-only items', () => {
    const item = { audioOnly: true } as Pick<DownloadItem, 'audioOnly'>
    const options = buildDownloadOptionsForItem(item, baseParams)
    expect(options.audioOnly).toBe(true)
    expect(options.outputDirectory).toBe('C:\\Audio')
  })

  it('selects the video output directory for video items', () => {
    const item = { audioOnly: false } as Pick<DownloadItem, 'audioOnly'>
    const options = buildDownloadOptionsForItem(item, baseParams)
    expect(options.audioOnly).toBe(false)
    expect(options.outputDirectory).toBe('C:\\Video')
  })

  it('uses empty directories as fallback defaults', () => {
    const item = { audioOnly: true } as Pick<DownloadItem, 'audioOnly'>
    const options = buildDownloadOptionsForItem(item, {
      ...baseParams,
      audioOutputDir: '',
    })
    expect(options.outputDirectory).toBe('')
  })

  it('picks audio options for audio-only items', () => {
    const item = { audioOnly: true } as Pick<DownloadItem, 'audioOnly'>
    const options = buildDownloadOptionsForItem(item, baseParams)
    expect(options.audioFormat).toBe('mp3')
    expect(options.audioQuality).toBe('192k')
    expect(options.embedThumbnail).toBe(true)
    expect(options.addMetadata).toBe(true)
    expect(options.embedSubtitles).toBe(false)
  })

  it('picks video options for video items', () => {
    const item = { audioOnly: false } as Pick<DownloadItem, 'audioOnly'>
    const options = buildDownloadOptionsForItem(item, baseParams)
    expect(options.videoQuality).toBe('1080p')
    expect(options.videoFormat).toBe('mp4')
    expect(options.videoAudioFormat).toBe('aac')
    expect(options.embedThumbnail).toBe(true)
    expect(options.addMetadata).toBe(false)
    expect(options.embedSubtitles).toBe(false)
  })

  it('passes browser cookie options through', () => {
    const item = { audioOnly: false } as Pick<DownloadItem, 'audioOnly'>
    const options = buildDownloadOptionsForItem(item, baseParams)
    expect(options.useBrowserCookies).toBe(true)
    expect(options.browserSource).toBe('firefox')
  })
})
