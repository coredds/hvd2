import i18n from '../i18n'
import type { ElectronAPI } from '../electron'
import { useDownloadStore } from '../stores/downloadStore'
import { useLogStore } from '../stores/logStore'

interface StatusCallbacks {
  setStatusMessage: (key: string) => void
  setStatusSpinner: (show: boolean) => void
}

export function subscribeDownloadEvents(api: ElectronAPI['downloads'], callbacks: StatusCallbacks): () => void {
  let resetTimer: ReturnType<typeof setTimeout> | undefined
  const hasItem = (id: string) => useDownloadStore.getState().items.some((item) => item.id === id)
  const hasActiveDownloads = () => useDownloadStore.getState().items.some((item) => item.status === 'DOWNLOADING')
  const clearResetTimer = () => {
    if (resetTimer !== undefined) clearTimeout(resetTimer)
    resetTimer = undefined
  }

  const onProgress: Parameters<typeof api.onProgress>[0] = (_event, { id, progress }) => {
    if (!hasItem(id)) return
    clearResetTimer()
    useDownloadStore.getState().updateProgress(id, progress)
    callbacks.setStatusSpinner(hasActiveDownloads())
  }
  const onLog: Parameters<typeof api.onLog>[0] = (_event, { id, line }) => {
    if (hasItem(id)) useLogStore.getState().appendLog(line)
  }
  const onStatus: Parameters<typeof api.onStatus>[0] = (_event, { id, key }) => {
    if (!hasItem(id)) return
    clearResetTimer()
    callbacks.setStatusMessage(key)
  }
  const onComplete: Parameters<typeof api.onComplete>[0] = (_event, { id, filePath }) => {
    if (!hasItem(id)) return
    clearResetTimer()
    useDownloadStore.getState().setFilePath(id, filePath)
    useDownloadStore.getState().updateStatus(id, 'COMPLETED')
    callbacks.setStatusMessage('status.download.completed')
    callbacks.setStatusSpinner(hasActiveDownloads())
    resetTimer = setTimeout(() => {
      if (!hasActiveDownloads()) callbacks.setStatusMessage('status.ready')
      resetTimer = undefined
    }, 3000)
  }
  const onError: Parameters<typeof api.onError>[0] = (_event, { id, message, kind, cookiesFailed }) => {
    if (!hasItem(id)) return
    clearResetTimer()
    useDownloadStore.getState().updateStatus(id, 'ERROR')
    useDownloadStore.getState().setError(id, message, kind, cookiesFailed)
    callbacks.setStatusMessage('status.error')
    callbacks.setStatusSpinner(hasActiveDownloads())
    useLogStore.getState().appendLog(i18n.t('downloads.error.log').replace('{0}', message))
  }
  const onPaused: Parameters<typeof api.onPaused>[0] = (_event, { id }) => {
    if (!hasItem(id)) return
    clearResetTimer()
    useDownloadStore.getState().updateStatus(id, 'PAUSED')
    callbacks.setStatusSpinner(hasActiveDownloads())
  }

  api.onProgress(onProgress)
  api.onLog(onLog)
  api.onStatus(onStatus)
  api.onComplete(onComplete)
  api.onError(onError)
  api.onPaused(onPaused)
  return () => {
    clearResetTimer()
    api.offProgress(onProgress)
    api.offLog(onLog)
    api.offStatus(onStatus)
    api.offComplete(onComplete)
    api.offError(onError)
    api.offPaused(onPaused)
  }
}
