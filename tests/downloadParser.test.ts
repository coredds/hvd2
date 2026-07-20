import { describe, it, expect } from 'vitest'
import { parseDownloadLine } from '../electron/services/DownloadParser'

describe('parseDownloadLine', () => {
  it('extracts download progress', () => {
    const result = parseDownloadLine('[download]  42.5% of ~100MiB at 5MiB/s ETA 00:10', false, false)
    expect(result.progress).toBe(0.425)
    expect(result.inPostProcessing).toBe(false)
  })

  it('ignores progress once post-processing has started', () => {
    const result = parseDownloadLine('[download]  99% of 100MiB', true, false)
    expect(result.progress).toBeUndefined()
    expect(result.inPostProcessing).toBe(true)
  })

  it('detects entry into post-processing from [ffmpeg]', () => {
    const result = parseDownloadLine('[ffmpeg] Destination: out.mp4', false, false)
    expect(result.enteredPostProcessing).toBe(true)
    expect(result.inPostProcessing).toBe(true)
    expect(result.progress).toBe(0.95)
    expect(result.statusKey).toBe('status.reencoding')
  })

  it('detects entry into post-processing from [PostProcessor]', () => {
    const result = parseDownloadLine('[PostProcessor] Running move_info', false, false)
    expect(result.enteredPostProcessing).toBe(true)
    expect(result.statusKey).toBe('status.reencoding')
  })

  it('extracts destination file and flags intermediate temp files', () => {
    const result = parseDownloadLine('[download] Destination: My Video [abc123].f303.webm', false, false)
    expect(result.destination?.path).toBe('My Video [abc123].f303.webm')
    expect(result.destination?.isIntermediate).toBe(true)
  })

  it('extracts destination file and flags thumbnails when embedding', () => {
    const result = parseDownloadLine('[download] Destination: My Video [abc123].jpg', false, true)
    expect(result.destination?.isIntermediate).toBe(true)
  })

  it('does not flag thumbnails as intermediate when not embedding', () => {
    const result = parseDownloadLine('[download] Destination: My Video [abc123].jpg', false, false)
    expect(result.destination?.isIntermediate).toBe(false)
  })

  it('extracts cached thumbnail when embedding', () => {
    const result = parseDownloadLine('[download] My Video [abc123].webp has already been downloaded', false, true)
    expect(result.thumbnails).toEqual(['My Video [abc123].webp'])
  })

  it('ignores cached thumbnail when not embedding', () => {
    const result = parseDownloadLine('[download] My Video [abc123].webp has already been downloaded', false, false)
    expect(result.thumbnails).toEqual([])
  })

  it('extracts written thumbnail path when embedding', () => {
    const result = parseDownloadLine('[info] Writing video thumbnail thumb.webp to: thumb.jpg', false, true)
    expect(result.thumbnails).toEqual(['thumb.jpg'])
  })

  it('extracts final merged file path and status', () => {
    const result = parseDownloadLine('[Merger] Merging formats into "My Video [abc123].mp4"', false, false)
    expect(result.finalFilePath).toBe('My Video [abc123].mp4')
    expect(result.statusKey).toBe('status.merging')
  })

  it('returns a line with no recognized events unchanged', () => {
    const result = parseDownloadLine('[generic] Extracting information', false, false)
    expect(result.progress).toBeUndefined()
    expect(result.destination).toBeUndefined()
    expect(result.finalFilePath).toBeUndefined()
    expect(result.thumbnails).toEqual([])
    expect(result.inPostProcessing).toBe(false)
  })
})
