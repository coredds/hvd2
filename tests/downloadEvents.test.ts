import { EventEmitter } from 'node:events'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ElectronAPI } from '../src/electron'
import { subscribeDownloadEvents } from '../src/lib/downloadEvents'
import { useDownloadStore } from '../src/stores/downloadStore'
import { useLogStore } from '../src/stores/logStore'

function createApi() {
  const events = new EventEmitter()
  const api: ElectronAPI['downloads'] = {
    start: vi.fn(), cancel: vi.fn(), extractTitle: vi.fn(),
    onProgress: (cb) => { events.on('progress', cb) },
    offProgress: (cb) => { events.off('progress', cb) },
    onLog: (cb) => { events.on('log', cb) },
    offLog: (cb) => { events.off('log', cb) },
    onStatus: (cb) => { events.on('status', cb) },
    offStatus: (cb) => { events.off('status', cb) },
    onComplete: (cb) => { events.on('complete', cb) },
    offComplete: (cb) => { events.off('complete', cb) },
    onError: (cb) => { events.on('error', cb) },
    offError: (cb) => { events.off('error', cb) },
    onPaused: (cb) => { events.on('paused', cb) },
    offPaused: (cb) => { events.off('paused', cb) },
  }
  return { api, events }
}

describe('app-owned download events', () => {
  const cleanups: (() => void)[] = []
  beforeEach(() => {
    vi.useFakeTimers()
    useDownloadStore.getState().clearAll()
    useLogStore.getState().clearLogs()
  })
  afterEach(() => {
    cleanups.splice(0).forEach((cleanup) => cleanup())
    vi.useRealTimers()
  })

  function setup() {
    const { api, events } = createApi()
    const callbacks = { setStatusMessage: vi.fn(), setStatusSpinner: vi.fn() }
    const cleanup = subscribeDownloadEvents(api, callbacks)
    cleanups.push(cleanup)
    useDownloadStore.getState().addUrls([
      { url: 'https://example.com/1', audioOnly: false, format: 'video', noPlaylist: true },
    ])
    const id = useDownloadStore.getState().items[0].id
    useDownloadStore.getState().updateStatus(id, 'DOWNLOADING')
    return { events, callbacks, cleanup, id }
  }

  it('updates queue progress, logs and status through a persistent subscription', () => {
    const { events, callbacks, id } = setup()
    events.emit('progress', {}, { id, progress: 0.4 })
    events.emit('log', {}, { id, line: 'downloading' })
    events.emit('status', {}, { id, key: 'status.merging' })
    expect(useDownloadStore.getState().items[0].progress).toBe(0.4)
    expect(useLogStore.getState().lines.join('\n')).toContain('downloading')
    expect(callbacks.setStatusMessage).toHaveBeenLastCalledWith('status.merging')
  })

  it('preserves the final path when a download completes', () => {
    const { events, callbacks, id } = setup()
    events.emit('complete', {}, { id, filePath: '/downloads/video.mp4' })
    expect(useDownloadStore.getState().items[0]).toMatchObject({
      status: 'COMPLETED', progress: 1, filePath: '/downloads/video.mp4',
    })
    expect(callbacks.setStatusSpinner).toHaveBeenLastCalledWith(false)
  })

  it('records errors and pauses without hiding other active downloads', () => {
    const { events, callbacks, id } = setup()
    useDownloadStore.getState().addUrls([
      { url: 'https://example.com/2', audioOnly: false, format: 'video', noPlaylist: true },
    ])
    const other = useDownloadStore.getState().items[1].id
    useDownloadStore.getState().updateStatus(other, 'DOWNLOADING')
    events.emit('error', {}, { id, message: 'sign in', kind: 'auth', cookiesFailed: true })
    expect(useDownloadStore.getState().items[0]).toMatchObject({
      status: 'ERROR', errorMessage: 'sign in', errorKind: 'auth', cookiesFailed: true,
    })
    expect(callbacks.setStatusSpinner).toHaveBeenLastCalledWith(true)
    events.emit('paused', {}, { id: other })
    expect(useDownloadStore.getState().items[1].status).toBe('PAUSED')
    expect(callbacks.setStatusSpinner).toHaveBeenLastCalledWith(false)
  })

  it('ignores late events for a removed item', () => {
    const { events, callbacks, id } = setup()
    useDownloadStore.getState().removeItems([id])
    events.emit('complete', {}, { id, filePath: '/stale.mp4' })
    events.emit('error', {}, { id, message: 'stale', kind: 'unknown', cookiesFailed: false })
    events.emit('log', {}, { id, line: 'stale' })
    expect(callbacks.setStatusMessage).not.toHaveBeenCalled()
    expect(useLogStore.getState().lines).toHaveLength(0)
  })

  it('unregisters exact listeners and cancels pending status timers on cleanup', () => {
    const { events, callbacks, cleanup, id } = setup()
    events.emit('complete', {}, { id, filePath: '/video.mp4' })
    cleanup()
    expect(events.eventNames()).toHaveLength(0)
    callbacks.setStatusMessage.mockClear()
    vi.runAllTimers()
    expect(callbacks.setStatusMessage).not.toHaveBeenCalled()
    events.emit('progress', {}, { id, progress: 0.1 })
    expect(useDownloadStore.getState().items[0].progress).toBe(1)
  })

  it('does not reset a later error status when an earlier completion timer expires', () => {
    const { events, callbacks, id } = setup()
    events.emit('complete', {}, { id, filePath: '/video.mp4' })
    events.emit('error', {}, { id, message: 'later failure', kind: 'unknown', cookiesFailed: false })
    vi.runAllTimers()
    expect(callbacks.setStatusMessage).toHaveBeenLastCalledWith('status.error')
  })
})
