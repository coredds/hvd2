import type { DownloadEventListener, DownloadEventSubscriptions, DownloadEventTransport } from '../ipc'

export function createDownloadEventAdapter(transport: DownloadEventTransport): DownloadEventSubscriptions {
  function bind<T>(subscribe: (callback: DownloadEventListener<T>) => () => void) {
    const subscriptions = new Map<DownloadEventListener<T>, (() => void)[]>()
    return {
      on: (callback: DownloadEventListener<T>) => {
        const unsubscribe = subscribe(callback)
        const registered = subscriptions.get(callback) ?? []
        registered.push(unsubscribe)
        subscriptions.set(callback, registered)
      },
      off: (callback: DownloadEventListener<T>) => {
        const registered = subscriptions.get(callback)
        registered?.pop()?.()
        if (registered?.length === 0) subscriptions.delete(callback)
      },
    }
  }
  // Callback identities are stable here in the renderer, unlike preload-side proxies.
  const progress = bind(transport.onProgress)
  const log = bind(transport.onLog)
  const status = bind(transport.onStatus)
  const complete = bind(transport.onComplete)
  const error = bind(transport.onError)
  const paused = bind(transport.onPaused)
  return {
    onProgress: progress.on, offProgress: progress.off,
    onLog: log.on, offLog: log.off,
    onStatus: status.on, offStatus: status.off,
    onComplete: complete.on, offComplete: complete.off,
    onError: error.on, offError: error.off,
    onPaused: paused.on, offPaused: paused.off,
  }
}
