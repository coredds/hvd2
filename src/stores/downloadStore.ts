import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import i18n from '../i18n'
import type { DownloadItem, DownloadStatus } from '../types'

interface DownloadStore {
  items: DownloadItem[]
  addUrls: (urls: { url: string; noPlaylist: boolean; format: string }[]) => void
  removeItems: (ids: string[]) => void
  updateProgress: (id: string, progress: number) => void
  updateStatus: (id: string, status: DownloadStatus) => void
  setTitle: (id: string, title: string) => void
  setFilePath: (id: string, filePath: string) => void
  setErrorMessage: (id: string, message: string) => void
  clearAll: () => void
}

export const useDownloadStore = create<DownloadStore>((set) => ({
  items: [],

  addUrls: (urls) =>
    set((state) => {
      const existingUrls = new Set(state.items.map((i) => i.url))
      const newItems: DownloadItem[] = []
      for (const { url, noPlaylist, format } of urls) {
        if (existingUrls.has(url)) {
          const existing = state.items.find((i) => i.url === url)
          if (existing?.status === 'COMPLETED') continue
          continue
        }
        newItems.push({
          id: uuidv4(),
          url,
          title: i18n.t('general.unknown.title'),
          format,
          status: 'QUEUED',
          progress: 0,
          errorMessage: '',
          filePath: '',
          noPlaylist,
        })
        existingUrls.add(url)
      }
      return { items: [...state.items, ...newItems] }
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

  setErrorMessage: (id, errorMessage) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, errorMessage } : item
      ),
    })),

  clearAll: () => set({ items: [] }),
}))