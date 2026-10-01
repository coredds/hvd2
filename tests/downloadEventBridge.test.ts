import { EventEmitter } from 'node:events'
import { describe, expect, it, vi } from 'vitest'
import { createDownloadEventSubscriptions } from '../electron/services/DownloadEventBridge'
import { createDownloadEventAdapter } from '../src/lib/downloadEventAdapter'

function setup() {
  const events = new EventEmitter()
  const native = createDownloadEventSubscriptions({
    on: (channel, listener) => events.on(channel, listener),
    removeListener: (channel, listener) => events.removeListener(channel, listener),
  })
  const api = createDownloadEventAdapter(crossContext(native))
  return { events, api, native }
}

function crossContext<T extends object>(api: T): T {
  return new Proxy(api, {
    get(target, property) {
      const method = Reflect.get(target, property) as (...args: unknown[]) => unknown
      return (...args: unknown[]) => method(...args.map((argument) =>
        typeof argument === 'function' ? (...values: unknown[]) => argument(...values) : argument))
    },
  })
}

describe('typed download event bridge', () => {
  it('removes listeners even when the context bridge creates new callback proxies per invocation', () => {
    const { api, events } = setup()
    const callback = vi.fn()
    api.onProgress(callback)
    api.offProgress(callback)
    expect(events.listenerCount('download:progress')).toBe(0)
  })

  it('makes native unsubscribe handles idempotent', () => {
    const { native, events } = setup()
    const cleanup = native.onPaused(vi.fn())
    cleanup()
    cleanup()
    expect(events.listenerCount('download:paused')).toBe(0)
  })
  it('forwards the payload without exposing the Electron event object', () => {
    const { api, events } = setup()
    const callback = vi.fn()
    const payload = { id: '1', progress: 0.5 }
    api.onProgress(callback)
    events.emit('download:progress', { sender: { privileged: true } }, payload)
    expect(callback).toHaveBeenCalledExactlyOnceWith(undefined, payload)
  })

  it('removes the exact wrapper associated with a renderer callback', () => {
    const { api, events } = setup()
    const removed = vi.fn()
    const retained = vi.fn()
    api.onComplete(removed)
    api.onComplete(retained)
    api.offComplete(removed)
    events.emit('download:complete', {}, { id: '1', filePath: '/video.mp4' })
    expect(removed).not.toHaveBeenCalled()
    expect(retained).toHaveBeenCalledTimes(1)
    expect(events.listenerCount('download:complete')).toBe(1)
  })

  it('removes duplicate registrations one at a time', () => {
    const { api, events } = setup()
    const callback = vi.fn()
    api.onPaused(callback)
    api.onPaused(callback)
    api.offPaused(callback)
    events.emit('download:paused', {}, { id: '1' })
    expect(callback).toHaveBeenCalledTimes(1)
    api.offPaused(callback)
    expect(events.listenerCount('download:paused')).toBe(0)
  })

  it('keeps registrations independent across event channels', () => {
    const { api, events } = setup()
    const callback = vi.fn()
    api.onProgress(callback)
    api.onLog(callback)
    api.offProgress(callback)
    events.emit('download:log', {}, { id: '1', line: 'running' })
    expect(callback).toHaveBeenCalledExactlyOnceWith(undefined, { id: '1', line: 'running' })
    api.offLog(callback)
    expect(events.eventNames()).toHaveLength(0)
  })

  it('ignores removal of an unregistered callback', () => {
    const { api, events } = setup()
    api.onStatus(vi.fn())
    api.offStatus(vi.fn())
    expect(events.listenerCount('download:status')).toBe(1)
  })
})
