import { create } from 'zustand'
import { DEFAULT_PREFERENCES } from '../types'
import type { Preferences } from '../types'

interface SettingsStore {
  prefs: Preferences
  ytDlpStatus: 'unknown' | 'available' | 'not-found' | 'outdated'
  ytDlpVersion: string
  ffmpegStatus: 'unknown' | 'available' | 'not-found'
  denoStatus: 'unknown' | 'available' | 'not-found'
  isInitializing: boolean
  setPrefs: (prefs: Partial<Preferences>) => void
  setYtDlpStatus: (status: 'unknown' | 'available' | 'not-found' | 'outdated', version?: string) => void
  setFFmpegStatus: (status: 'unknown' | 'available' | 'not-found') => void
  setDenoStatus: (status: 'unknown' | 'available' | 'not-found') => void
  setInitializing: (val: boolean) => void
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  prefs: { ...DEFAULT_PREFERENCES },
  ytDlpStatus: 'unknown',
  ytDlpVersion: '',
  ffmpegStatus: 'unknown',
  denoStatus: 'unknown',
  isInitializing: true,

  setPrefs: (prefs) =>
    set((state) => ({
      prefs: { ...state.prefs, ...prefs },
    })),

  setYtDlpStatus: (status, version = '') =>
    set({ ytDlpStatus: status, ytDlpVersion: version }),

  setFFmpegStatus: (status) => set({ ffmpegStatus: status }),

  setDenoStatus: (status) => set({ denoStatus: status }),

  setInitializing: (val) => set({ isInitializing: val }),
}))