import type { DownloadEventListener, DownloadEventPayloads, DownloadEventTransport } from '../../src/ipc'

type WrappedListener = (event: unknown, payload: unknown) => void

interface IpcEvents {
  on: (channel: string, listener: WrappedListener) => unknown
  removeListener: (channel: string, listener: WrappedListener) => unknown
}

export function createDownloadEventSubscriptions(ipc: IpcEvents): DownloadEventTransport {
  function bind<K extends keyof DownloadEventPayloads>(event: K) {
    const channel = `download:${event}`
    return (callback: DownloadEventListener<DownloadEventPayloads[K]>) => {
      // Only the main-process payload crosses the bridge, never the privileged IPC event.
      const listener: WrappedListener = (_event, payload) => callback(undefined, payload as DownloadEventPayloads[K])
      ipc.on(channel, listener)
      let active = true
      // A returned handle retains the native listener identity across contextBridge proxies.
      return () => {
        if (!active) return
        active = false
        ipc.removeListener(channel, listener)
      }
    }
  }

  const progress = bind('progress')
  const log = bind('log')
  const status = bind('status')
  const complete = bind('complete')
  const error = bind('error')
  const paused = bind('paused')
  return {
    onProgress: progress, onLog: log, onStatus: status,
    onComplete: complete, onError: error, onPaused: paused,
  }
}
