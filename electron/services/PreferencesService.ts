import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import { DEFAULT_PREFERENCES } from '../../src/types'
import type { Preferences } from '../../src/types'
import { normalizePreferences } from '../../src/lib/preferences'

export class PreferencesService {
  private prefsPath: string
  private data: Record<string, unknown> = {}

  constructor() {
    const userDataPath = app.getPath('userData')
    this.prefsPath = path.join(userDataPath, 'hvd-preferences.json')
    this.load()
  }

  private load() {
    try {
      if (fs.existsSync(this.prefsPath)) {
        const raw = fs.readFileSync(this.prefsPath, 'utf8')
        const parsed: unknown = JSON.parse(raw)
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          this.data = parsed as Record<string, unknown>
        }
      }
    } catch {
      // Invalid or unreadable preferences fall back to the defaults.
      this.data = {}
    }
  }

  save() {
    try {
      fs.writeFileSync(this.prefsPath, JSON.stringify(this.data, null, 2), 'utf8')
    } catch {
      // Disk write failures are non-fatal; preferences will be recreated next run
    }
  }

  get(key: string, defaultValue?: unknown): unknown {
    if (Object.hasOwn(this.data, key)) return this.data[key]
    if (Object.hasOwn(DEFAULT_PREFERENCES, key)) return DEFAULT_PREFERENCES[key as keyof Preferences]
    return defaultValue ?? null
  }

  getBoolean(key: string, defaultValue = false): boolean {
    const val = this.get(key, undefined)
    if (val === undefined) return defaultValue
    return String(val).toLowerCase() === 'true'
  }

  set(key: string, value: unknown) {
    if (value === null || value === undefined) {
      delete this.data[key]
    } else {
      this.data[key] = value
    }
  }

  getAll(): Preferences & Record<string, unknown> {
    return { ...this.data, ...normalizePreferences(this.data) }
  }
}
