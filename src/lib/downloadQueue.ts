import type { ElectronAPI } from '../electron'
import type { DownloadItem, DownloadOptions } from '../types'
import { useDownloadStore } from '../stores/downloadStore'

const removingIds = new Set<string>()

export function getStartableItems(items: DownloadItem[]): DownloadItem[] {
  return items.filter((item) => !removingIds.has(item.id) && (item.status === 'QUEUED' || item.status === 'PAUSED'))
}

type PauseResult = { id: string; success: true } | { id: string; success: false; message: string }

export async function pauseDownloads(ids: string[], cancel: ElectronAPI['downloads']['cancel']): Promise<PauseResult[]> {
  return Promise.all(ids.map(async (id): Promise<PauseResult> => {
    try {
      await cancel(id)
      return { id, success: true }
    } catch (error) {
      return { id, success: false, message: error instanceof Error ? error.message : String(error) }
    }
  }))
}

export async function removeDownloads(ids: string[], cancel: ElectronAPI['downloads']['cancel']): Promise<void> {
  if (ids.some((id) => removingIds.has(id))) throw new Error('Downloads are already being removed')
  ids.forEach((id) => removingIds.add(id))
  try {
    const results = await pauseDownloads(ids, cancel)
    const failure = results.find((result) => !result.success)
    if (failure && !failure.success) throw new Error(failure.message)
    useDownloadStore.getState().removeItems(ids)
  } finally {
    ids.forEach((id) => removingIds.delete(id))
  }
}

export async function startDownload(
  item: DownloadItem,
  options: DownloadOptions,
  start: ElectronAPI['downloads']['start'],
): Promise<boolean> {
  const current = getStartableItems(useDownloadStore.getState().items).find((entry) => entry.id === item.id)
  if (!current) return false
  useDownloadStore.getState().updateStatus(item.id, 'DOWNLOADING')
  try {
    await start(current, options)
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    useDownloadStore.getState().updateStatus(item.id, 'ERROR')
    useDownloadStore.getState().setError(item.id, message, 'unknown', false)
    return false
  }
}
