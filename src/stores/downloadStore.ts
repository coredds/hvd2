import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import i18n from '../i18n'
import type { DownloadErrorKind, DownloadItem, DownloadStatus } from '../types'

interface DownloadStore {
  items: DownloadItem[]
  addUrls: (urls: { url: string; noPlaylist: boolean; format: string; audioOnly: boolean }[]) => void
  removeItems: (ids: string[]) => void
  updateProgress: (id: string, progress: number) => void
  updateStatus: (id: string, status: DownloadStatus) => void
  setTitle: (id: string, title: string) => void
  setFilePath: (id: string, filePath: string) => void
  setError: (id: string, message: string, kind: DownloadErrorKind, cookiesFailed: boolean) => void
  retryItem: (id: string) => void
  retryFailed: () => void
  clearAll: () => void
}

export const useDownloadStore = create<DownloadStore>((set) => ({
  items: [],

  addUrls: (urls) =>
    set((state) => {
      const items = [...state.items]
      const newItems: DownloadItem[] = []
      for (const { url, noPlaylist, format, audioOnly } of urls) {
        if (newItems.some((i) => i.url === url)) continue
        const existing = items.find((i) => i.url === url)
        if (existing) {
          if (existing.status !== 'ERROR') continue
          items.splice(items.indexOf(existing), 1)
        }
        newItems.push({
          id: uuidv4(),
          url,
          title: i18n.t('general.unknown.title'),
          format,
          audioOnly,
          status: 'QUEUED',
          progress: 0,
          errorMessage: '',
          errorKind: 'unknown',
          cookiesFailed: false,
          filePath: '',
          noPlaylist,
        })
      }
      return { items: [...items, ...newItems] }
    }),

  removeItems: (ids) =>
    set((state) => ({
      items: state.items.filter((item) => !ids.includes(item.id)),
    })),

  updateProgress: (id, progress) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, progress } : item
      ),
    })),

  updateStatus: (id, status) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, status, progress: status === 'COMPLETED' ? 1 : item.progress } : item
      ),
    })),

  setTitle: (id, title) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, title } : item
      ),
    })),

  setFilePath: (id, filePath) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, filePath } : item
      ),
    })),

  setError: (id, message, kind, cookiesFailed) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, errorMessage: message, errorKind: kind, cookiesFailed } : item
      ),
    })),

  retryItem: (id) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id
          ? { ...item, status: 'QUEUED', progress: 0, errorMessage: '', errorKind: 'unknown', cookiesFailed: false }
          : item
      ),
    })),

  retryFailed: () =>
    set((state) => ({
      items: state.items.map((item) =>
        item.status === 'ERROR'
          ? { ...item, status: 'QUEUED', progress: 0, errorMessage: '', errorKind: 'unknown', cookiesFailed: false }
          : item
      ),
    })),

  clearAll: () => set({ items: [] }),
}))