import i18n, { resolveAndApplyLanguage } from '../i18n'
import type { ElectronAPI } from '../ipc'
import { DEFAULT_PREFERENCES } from '../types'
import type { Preferences } from '../types'

interface StartupApi {
  prefs: Pick<ElectronAPI['prefs'], 'getAll'>
  deps: Pick<ElectronAPI['deps'], 'checkYtDlp' | 'checkFFmpeg' | 'checkDeno'>
}

interface StartupCallbacks {
  appendLog: (line: string) => void
  setPrefs: (prefs: Partial<Preferences>) => void
  setYtDlpStatus: (status: 'available' | 'not-found' | 'outdated', version?: string) => void
  setFFmpegStatus: (status: 'available' | 'not-found') => void
  setDenoStatus: (status: 'available' | 'not-found') => void
  onChecked: () => void
}

export function startAppInitialization(
  api: StartupApi,
  callbacks: StartupCallbacks,
  applyLanguage: (language: string) => Promise<void> = resolveAndApplyLanguage,
): () => void {
  let active = true
  callbacks.appendLog(i18n.t('log.app.started'))
  void (async () => {
    let saved: Preferences = { ...DEFAULT_PREFERENCES }
    try { saved = await api.prefs.getAll() } catch {
      // Use defaults if preferences are unavailable during startup.
    }
    if (!active) return
    callbacks.setPrefs(saved)
    try { await applyLanguage(saved['app.language'] || 'auto') } catch {
      // Keep the default language if locale initialization fails.
    }
    if (!active) return

    const missing: string[] = []
    let yt: Awaited<ReturnType<StartupApi['deps']['checkYtDlp']>> = { available: false }
    try { yt = await api.deps.checkYtDlp() } catch {
      // A failed availability check is reported as a missing dependency.
    }
    if (!active) return
    if (yt.available) {
      callbacks.setYtDlpStatus(yt.isRecent ? 'available' : 'outdated', yt.version)
      if (!yt.isRecent) missing.push('yt-dlp (outdated)')
    } else {
      callbacks.setYtDlpStatus('not-found')
      missing.push('yt-dlp')
    }

    let ffmpeg = false
    try { ffmpeg = await api.deps.checkFFmpeg() } catch {
      // A failed availability check is reported as a missing dependency.
    }
    if (!active) return
    callbacks.setFFmpegStatus(ffmpeg ? 'available' : 'not-found')
    if (!ffmpeg) missing.push('FFmpeg')

    let deno = false
    try { deno = await api.deps.checkDeno() } catch {
      // A failed availability check is reported as a missing dependency.
    }
    if (!active) return
    callbacks.setDenoStatus(deno ? 'available' : 'not-found')
    if (!deno) missing.push('Deno')
    callbacks.onChecked()
    if (missing.length > 0) callbacks.appendLog(i18n.t('app.deps.missing').replace('{0}', missing.join(', ')))
  })()
  return () => { active = false }
}
