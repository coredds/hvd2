import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getStartableItems, removeDownloads, startDownload, pauseDownloads } from '../src/lib/downloadQueue'
import { useDownloadStore } from '../src/stores/downloadStore'
import { DEFAULT_PREFERENCES } from '../src/types'
import { buildDownloadOptionsForItem } from '../src/lib/buildDownloadOptions'

describe('download queue operations', () => {
  beforeEach(() => {
    useDownloadStore.getState().clearAll()
    useDownloadStore.getState().addUrls(['queued', 'paused', 'active', 'completed', 'error'].map((name) => ({
      url: `https://example.com/${name}`, noPlaylist: true, format: 'video', audioOnly: false,
    })))
    const items = useDownloadStore.getState().items
    useDownloadStore.getState().updateStatus(items[1].id, 'PAUSED')
    useDownloadStore.getState().updateStatus(items[2].id, 'DOWNLOADING')
    useDownloadStore.getState().updateStatus(items[3].id, 'COMPLETED')
    useDownloadStore.getState().updateStatus(items[4].id, 'ERROR')
  })

  it('includes paused and queued downloads in Start All', () => {
    const items = useDownloadStore.getState().items
    expect(getStartableItems(items)).toEqual(items.slice(0, 2))
  })

  it('requests every pause immediately without waiting for other processes to close', async () => {
    const stops: (() => void)[] = []
    const cancel = vi.fn((_id: string) => new Promise<void>((resolve) => { stops.push(resolve) }))
    const pending = pauseDownloads(['first', 'second'], cancel)
    expect(cancel.mock.calls.map(([id]) => id)).toEqual(['first', 'second'])
    stops.forEach((stop) => stop())
    await expect(pending).resolves.toEqual([{ id: 'first', success: true }, { id: 'second', success: true }])
  })

  it('reports individual pause failures without preventing other cancellations', async () => {
    const cancel = vi.fn().mockRejectedValueOnce(new Error('cannot stop')).mockResolvedValueOnce(undefined)
    await expect(pauseDownloads(['first', 'second'], cancel)).resolves.toEqual([
      { id: 'first', success: false, message: 'cannot stop' }, { id: 'second', success: true },
    ])
  })

  it('waits for every selected process to stop before removing entries', async () => {
    const ids = useDownloadStore.getState().items.slice(0, 3).map((item) => item.id)
    let stop!: () => void
    const cancel = vi.fn((_id: string) => new Promise<void>((resolve) => { stop = resolve }))
    // Only one delayed cancellation; others resolve immediately.
    cancel.mockResolvedValueOnce(undefined).mockResolvedValueOnce(undefined)
    const pending = removeDownloads(ids, cancel)
    await Promise.resolve()
    expect(useDownloadStore.getState().items).toHaveLength(5)
    useDownloadStore.getState().updateStatus(ids[2], 'PAUSED')
    expect(getStartableItems(useDownloadStore.getState().items)).toHaveLength(0)
    stop()
    await pending
    expect(useDownloadStore.getState().items).toHaveLength(2)
    expect(cancel.mock.calls.map(([id]) => id)).toEqual(ids)
  })

  it('retains selected entries when cancellation fails', async () => {
    const id = useDownloadStore.getState().items[2].id
    await expect(removeDownloads([id], vi.fn().mockRejectedValue(new Error('cannot stop')))).rejects.toThrow('cannot stop')
    expect(useDownloadStore.getState().items).toHaveLength(5)
    useDownloadStore.getState().updateStatus(id, 'PAUSED')
    expect(getStartableItems(useDownloadStore.getState().items).map((item) => item.id)).toContain(id)
  })

  it('keeps removal locked until other cancellations finish after one fails', async () => {
    const ids = useDownloadStore.getState().items.slice(0, 2).map((item) => item.id)
    let stop!: () => void
    const cancel = vi.fn().mockRejectedValueOnce(new Error('cannot stop'))
      .mockImplementationOnce(() => new Promise<void>((resolve) => { stop = resolve }))
    let finished = false
    const pending = removeDownloads(ids, cancel).catch((error: unknown) => { finished = true; return error })
    await new Promise<void>((resolve) => setImmediate(resolve))
    expect(finished).toBe(false)
    expect(getStartableItems(useDownloadStore.getState().items)).toHaveLength(0)
    stop()
    expect(await pending).toBeInstanceOf(Error)
    expect(useDownloadStore.getState().items).toHaveLength(5)
  })

  it('does not report a second removal as completed while the first is still stopping', async () => {
    const id = useDownloadStore.getState().items[2].id
    let stop!: () => void
    const pending = removeDownloads([id], () => new Promise<void>((resolve) => { stop = resolve }))
    await expect(removeDownloads([id], vi.fn())).rejects.toThrow('already')
    stop()
    await pending
  })

  it('turns rejected start invocations into actionable errors', async () => {
    const item = useDownloadStore.getState().items[0]
    const prefs = DEFAULT_PREFERENCES
    const options = buildDownloadOptionsForItem(item, {
      audioFormat: prefs['audio.format'], audioQuality: prefs['audio.quality'],
      videoQuality: prefs['video.quality'], videoFormat: prefs['video.format'], videoAudioFormat: prefs['video.audio.format'],
      audioOutputDir: '', videoOutputDir: '', embedSubtitles: false, embedThumbnailV: false,
      embedThumbnailA: false, addMetadataV: false, addMetadataA: false, useBrowserCookies: false, browserSource: 'chrome',
    })
    await startDownload(item, options, vi.fn().mockRejectedValue(new Error('IPC unavailable')))
    expect(useDownloadStore.getState().items[0]).toMatchObject({ status: 'ERROR', errorMessage: 'IPC unavailable' })
  })
})
