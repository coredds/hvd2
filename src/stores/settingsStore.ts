import { create } from 'zustand'
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

const defaultPreferences: Preferences = {
  'audio.format': 'mp3',
  'audio.quality': '192k',
  'video.quality': '1080p',
  'video.format': 'mp4',
  'video.audio.format': 'aac',
  'video.output.directory': '',
  'audio.output.directory': '',
  'embed.subtitles': false,
  'embed.thumbnail': true,
  'add.metadata': false,
  'embed.thumbnail.audio': true,
  'add.metadata.audio': true,
  'download.type.audio': false,
  'use.separate.folders': true,
  'app.language': 'auto',
  'app.theme': 'auto',
  'browser.cookies.enabled': true,
  'browser.cookies.source': 'firefox',
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  prefs: { ...defaultPreferences },
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