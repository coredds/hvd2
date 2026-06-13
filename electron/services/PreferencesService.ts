import fs from 'fs'
import path from 'path'
import { app } from 'electron'

export class PreferencesService {
  private prefsPath: string
  private data: Record<string, any> = {}

  private static readonly DEFAULTS: Record<string, any> = {
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
    } catch {}
  }

  get(key: string, defaultValue?: any): any {
    if (key in this.data) return this.data[key]
    if (key in PreferencesService.DEFAULTS) return PreferencesService.DEFAULTS[key]
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
    return { ...PreferencesService.DEFAULTS, ...this.data }
  }
}