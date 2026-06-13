import { useState, useEffect, Component } from 'react'
import { useTranslation } from 'react-i18next'
import { resolveAndApplyLanguage } from './i18n'
import DownloadsTab from './components/tabs/DownloadsTab'
import SettingsTab from './components/tabs/SettingsTab'
import LogsTab from './components/tabs/LogsTab'
import StatusBar from './components/StatusBar'
import { useLogStore } from './stores/logStore'
import { useSettingsStore } from './stores/settingsStore'

class ErrorBoundary extends Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) {
      const { message, stack } = this.state.error
      return (
        <div style={{ padding: 20, color: 'red', fontFamily: 'monospace', fontSize: 12 }}>
          <h3>App Error</h3>
          <pre>{message}</pre>
          <pre>{stack}</pre>
        </div>
      )
    }
    return this.props.children
  }
}

const tabs = ['tab.downloads', 'tab.settings', 'tab.logs'] as const

export default function App() {
  const { t } = useTranslation()
  const appendLog = useLogStore((s) => s.appendLog)
  const setYtDlpStatus = useSettingsStore((s) => s.setYtDlpStatus)
  const setFFmpegStatus = useSettingsStore((s) => s.setFFmpegStatus)
  const setDenoStatus = useSettingsStore((s) => s.setDenoStatus)
  const setPrefs = useSettingsStore((s) => s.setPrefs)
  const prefs = useSettingsStore((s) => s.prefs)
  const ytDlpStatus = useSettingsStore((s) => s.ytDlpStatus)
  const ffmpegStatus = useSettingsStore((s) => s.ffmpegStatus)
  const denoStatus = useSettingsStore((s) => s.denoStatus)

  const [activeTab, setActiveTab] = useState(0)
  const [statusMessage, setStatusMessage] = useState('status.ready')
  const [statusSpinner, setStatusSpinner] = useState(false)
  const [depsChecked, setDepsChecked] = useState(false)
  const [missingDeps, setMissingDeps] = useState<string[]>([])

  useEffect(() => {
    appendLog(t('log.app.started'))
    checkDepsOnStart()
  }, [])

  // Apply theme to <html> element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', prefs['app.theme'] || 'auto')
  }, [prefs['app.theme']])

  const checkDepsOnStart = async () => {
    const api = window.electronAPI
    if (!api) return

    // Load saved preferences from disk
    let saved: any = null
    try {
      saved = await api.prefs.getAll()
      if (saved) setPrefs(saved)
    } catch {}

    // Apply language from saved preference or auto-detect
    try {
      const langPref = saved?.['app.language'] || 'auto'
      await resolveAndApplyLanguage(langPref)
    } catch {}

    const missing: string[] = []

    try {
      const yt = await api.deps.checkYtDlp()
      if (yt.available) {
        setYtDlpStatus(yt.isRecent ? 'available' : 'outdated', yt.version)
        if (!yt.isRecent) missing.push('yt-dlp (outdated)')
      } else {
        setYtDlpStatus('not-found')
        missing.push('yt-dlp')
      }
    } catch {
      setYtDlpStatus('not-found')
      missing.push('yt-dlp')
    }

    try {
      const ff = await api.deps.checkFFmpeg()
      setFFmpegStatus(ff ? 'available' : 'not-found')
      if (!ff) missing.push('FFmpeg')
    } catch {
      setFFmpegStatus('not-found')
      missing.push('FFmpeg')
    }

    try {
      const dn = await api.deps.checkDeno()
      setDenoStatus(dn ? 'available' : 'not-found')
      if (!dn) missing.push('Deno')
    } catch {
      setDenoStatus('not-found')
      missing.push('Deno')
    }

    setMissingDeps(missing)
    setDepsChecked(true)

    if (missing.length > 0) {
      appendLog(`Missing dependencies: ${missing.join(', ')}. Open Settings to download.`)
    }
  }

  const hasDepsIssue = ytDlpStatus === 'not-found' || ytDlpStatus === 'outdated' ||
    ffmpegStatus === 'not-found' || denoStatus === 'not-found'

  return (
    <ErrorBoundary>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-main)' }}>
        {/* Dependency warning banner */}
        {depsChecked && hasDepsIssue && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 14px',
            background: ytDlpStatus === 'not-found' ? '#F44336' : '#FF9800',
            color: 'white',
            fontSize: 12,
            fontWeight: 500,
          }}>
            <span>{ytDlpStatus === 'not-found'
              ? 'yt-dlp is required to download videos. '
              : 'Some dependencies are missing or outdated. '}
            </span>
            <button
              onClick={() => setActiveTab(1)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.4)',
                borderRadius: 4,
                padding: '3px 10px',
                fontSize: 11,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Open Settings
            </button>
          </div>
        )}

        {/* Tab header */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-tab)', background: 'var(--bg-surface)' }}>
          {tabs.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={`tab-btn${i === activeTab ? ' active' : ''}`}
            >
              {t(tab)}
              {i === 1 && hasDepsIssue && depsChecked && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  marginLeft: 6, width: 16, height: 16, borderRadius: 8,
                  background: '#F44336', color: 'white', fontSize: 9, fontWeight: 700,
                }}>!</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
          {activeTab === 0 && (
            <DownloadsTab
              setStatusMessage={setStatusMessage}
              setStatusSpinner={setStatusSpinner}
            />
          )}
          {activeTab === 1 && <SettingsTab />}
          {activeTab === 2 && <LogsTab />}
        </div>

        {/* Status bar */}
        <StatusBar messageKey={statusMessage} showSpinner={statusSpinner} />
      </div>
    </ErrorBoundary>
  )
}