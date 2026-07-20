import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import { DEFAULT_PREFERENCES } from '../../src/types'

export class PreferencesService {
  private prefsPath: string
  private data: Record<string, any> = {}

  constructor() {
    const userDataPath = app.getPath('userData')
    this.prefsPath = path.join(userDataPath, 'hvd-preferences.json')
    this.load()
  }

  private load() {
    try {
      if (fs.existsSync(this.prefsPath)) {
        const raw = fs.readFileSync(this.prefsPath, 'utf8')
        this.data = JSON.parse(raw)
      }
    } catch {
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

  get(key: string, defaultValue?: any): any {
    if (key in this.data) return this.data[key]
    if (key in DEFAULT_PREFERENCES) return (DEFAULT_PREFERENCES as Record<string, any>)[key]
    return defaultValue ?? null
  }

  getBoolean(key: string, defaultValue = false): boolean {
    const val = this.get(key, undefined)
    if (val === undefined) return defaultValue
    return String(val).toLowerCase() === 'true'
  }

  set(key: string, value: any) {
    if (value === null || value === undefined) {
      delete this.data[key]
    } else {
      this.data[key] = value
    }
  }

  getAll(): Record<string, any> {
    return { ...DEFAULT_PREFERENCES, ...this.data }
  }
}