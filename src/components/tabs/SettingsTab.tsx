import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { resolveAndApplyLanguage } from '../../i18n'
import { useSettingsStore } from '../../stores/settingsStore'
import { useLogStore } from '../../stores/logStore'
import type { DependencyType } from '../../types'

const btnStyle: React.CSSProperties = {
  padding: '5px 12px',
  fontSize: 12,
  borderRadius: 4,
  border: 'none',
  cursor: 'pointer',
  fontWeight: 500,
}

export default function SettingsTab() {
  const { t } = useTranslation()
  const appendLog = useLogStore((s) => s.appendLog)
  const prefs = useSettingsStore((s) => s.prefs)
  const setPrefs = useSettingsStore((s) => s.setPrefs)
  const ytDlpStatus = useSettingsStore((s) => s.ytDlpStatus)
  const ffmpegStatus = useSettingsStore((s) => s.ffmpegStatus)
  const denoStatus = useSettingsStore((s) => s.denoStatus)
  const ytDlpVersion = useSettingsStore((s) => s.ytDlpVersion)
  const setYtDlpStatus = useSettingsStore((s) => s.setYtDlpStatus)
  const setFFmpegStatus = useSettingsStore((s) => s.setFFmpegStatus)
  const setDenoStatus = useSettingsStore((s) => s.setDenoStatus)

  const [downloading, setDownloading] = useState<DependencyType | null>(null)
  const [setupExpanded, setSetupExpanded] = useState(false)

  const downloadDep = async (dep: DependencyType) => {
    setDownloading(dep)
    appendLog(t('log.deps.downloading').replace('{0}', dep === 'ytdlp' ? 'yt-dlp' : dep === 'ffmpeg' ? 'FFmpeg' : 'Deno'))
    const api = window.electronAPI
    try {
      if (dep === 'ytdlp') await api.deps.downloadYtDlp()
      else if (dep === 'ffmpeg') await api.deps.downloadFFmpeg()
      else await api.deps.downloadDeno()

      appendLog(t('log.deps.installed').replace('{0}', dep))
      // Refresh status — re-run the check
      if (dep === 'ytdlp') {
        const yt = await api.deps.checkYtDlp()
        setYtDlpStatus(yt.available ? (yt.isRecent ? 'available' : 'outdated') : 'not-found', yt.version)
      } else if (dep === 'ffmpeg') {
        const ok = await api.deps.checkFFmpeg()
        setFFmpegStatus(ok ? 'available' : 'not-found')
      } else {
        const ok = await api.deps.checkDeno()
        setDenoStatus(ok ? 'available' : 'not-found')
      }
      return true
    } catch (err: any) {
      appendLog(`Failed: ${err?.message || err}`)
      return false
    } finally {
      setDownloading(null)
    }
  }

  const handleDownload = async (dep: DependencyType) => {
    const success = await downloadDep(dep)
    if (success) {
      await window.electronAPI.dialog.showAlert({
        title: t('settings.deps.installed.title'),
        message: t('settings.deps.installed.message').replace('{0}', dep === 'ytdlp' ? 'yt-dlp' : dep === 'ffmpeg' ? 'FFmpeg' : 'Deno'),
      })
    } else {
      await window.electronAPI.dialog.showAlert({
        title: t('alert.error'),
        message: t('settings.deps.failed.message').replace('{0}', dep),
      })
    }
  }

  const handleUpdateYtDlp = async () => {
    const [version, latest] = await Promise.all([
      window.electronAPI.deps.getYtDlpVersion(),
      window.electronAPI.deps.getYtDlpLatestVersion(),
    ])
    let message = t('settings.deps.update.message').replace('{0}', version)
    if (latest && latest !== version) {
      message = message.replace('{1}', latest)
    } else {
      message = message.replace('\n\n{1}', '')
    }
    const result = await window.electronAPI.dialog.showAlert({
      title: t('settings.deps.update.title'),
      message,
      type: 'question',
      buttons: [t('settings.deps.update.button'), t('alert.playlist.cancel')],
    })
    if (result === 0) await handleDownload('ytdlp')
  }

  const handleOpenBinFolder = async () => {
    await window.electronAPI.deps.openFolder('ytdlp')
  }

  const depIcon = (status: string) => {
    switch (status) {
      case 'available': return '\u2713'
      case 'outdated': return '\u26A0'
      case 'not-found': return '\u2717'
      default: return '\u2022'
    }
  }

  const depColor = (status: string) => {
    switch (status) {
      case 'available': return '#4CAF50'
      case 'outdated': return '#FF9800'
      case 'not-found': return '#F44336'
      default: return '#999'
    }
  }

  const depLabel = (dep: DependencyType, status: string) => {
    if (status === 'available') return t(`status.${dep}.available`)
    if (status === 'outdated') return t('status.ytdlp.outdated')
    return t(`status.${dep}.not.installed`)
  }

  const DepRow = ({ name, status, dep, version, canUpdate }: {
    name: string; status: string; dep: DependencyType; version?: string; canUpdate?: boolean
  }) => (
    <div className="dep-row">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 20, height: 20, borderRadius: 10, fontSize: 11,
            background: depColor(status), color: 'white', fontWeight: 700,
          }}>
            {depIcon(status)}
          </span>
          <span style={{ fontSize: 13, fontWeight: 500 }}>{name}</span>
          {version && (
            <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'Consolas, monospace' }}>v{version}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {status === 'not-found' ? (
            <button className="btn-primary" style={btnStyle} onClick={() => handleDownload(dep)} disabled={downloading === dep}>
              {downloading === dep ? t('settings.deps.downloading') : t('settings.deps.download')}
            </button>
          ) : canUpdate ? (
            <button className="btn-default" style={btnStyle} onClick={handleUpdateYtDlp}>{t('button.update')}</button>
          ) : (
            <button className="btn-default" style={btnStyle} onClick={() => handleDownload(dep)}>{t('button.download')}</button>
          )}
        </div>
      </div>
      <div style={{ fontSize: 12, color: depColor(status) }}>
        {depLabel(dep, status)}
      </div>
    </div>
  )

  const sectionStyle: React.CSSProperties = {
    border: '1px solid var(--border-main)',
    borderRadius: 4,
    background: 'var(--bg-surface)',
    padding: 14,
    marginBottom: 14,
  }

  const selectStyle: React.CSSProperties = {
    border: '1px solid var(--border-input)',
    borderRadius: 4,
    padding: '4px 8px',
    fontSize: 13,
    background: 'var(--bg-input)',
    color: 'var(--text-primary)',
  }

  return (
    <div>
      {/* Dependencies */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div className="section-title" style={{ marginBottom: 0 }}>{t('settings.dependencies')}</div>
          <button className="btn-default" style={{ ...btnStyle, fontSize: 11 }} onClick={handleOpenBinFolder}>
            {t('button.open.folder')}
          </button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 10 }}>
          <span dangerouslySetInnerHTML={{ __html: t('settings.deps.description') }} />
        </div>
        <>
            <DepRow name="yt-dlp" status={ytDlpStatus} dep="ytdlp" version={ytDlpVersion} canUpdate />
            <DepRow name="FFmpeg" status={ffmpegStatus} dep="ffmpeg" />
            <DepRow name="Deno" status={denoStatus} dep="deno" />
          </>
      </div>

      {/* Application Settings */}
      <div style={sectionStyle}>
        <div className="section-title">{t('settings.app.settings')}</div>

        <div className="form-row">
          <div className="form-label">{t('settings.language.label')}</div>
          <select
            style={selectStyle}
            value={prefs['app.language']}
            onChange={async (e) => {
              const value = e.target.value
              setPrefs({ 'app.language': value })
              await window.electronAPI.prefs.set('app.language', value)
              await resolveAndApplyLanguage(value)
            }}
          >
            <option value="auto">{t('settings.language.auto')}</option>
            <option value="en">{t('settings.language.en')}</option>
            <option value="pt_BR">{t('settings.language.pt_BR')}</option>
            <option value="es">{t('settings.language.es')}</option>
            <option value="it">{t('settings.language.it')}</option>
            <option value="ja">{t('settings.language.ja')}</option>
            <option value="de">{t('settings.language.de')}</option>
          </select>
        </div>

        <div className="form-row">
          <div className="form-label">{t('settings.theme.label')}</div>
          <select
            style={selectStyle}
            value={prefs['app.theme'] || 'auto'}
            onChange={(e) => {
              const theme = e.target.value
              setPrefs({ 'app.theme': theme })
              window.electronAPI.prefs.set('app.theme', theme).catch(() => {})
            }}
          >
            <option value="auto">{t('settings.theme.auto')}</option>
            <option value="light">{t('settings.theme.light')}</option>
            <option value="dark">{t('settings.theme.dark')}</option>
          </select>
        </div>

        {/* Authentication */}
        <div className="card" style={{ padding: 12, background: 'var(--bg-surface-alt)', marginTop: 12 }}>
          <div className="section-title">{t('settings.auth.title')}</div>
          <div className="form-help" style={{ marginBottom: 10 }}>
            {t('settings.auth.description')}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-primary" style={{ fontSize: 12, padding: '6px 14px' }} onClick={async () => {
              await window.electronAPI.app.loginUrl('https://www.youtube.com', t('general.login.title'))
            }}>
              {t('settings.auth.login.youtube')}
            </button>
            <button className="btn-primary" style={{ fontSize: 12, padding: '6px 14px' }} onClick={async () => {
              await window.electronAPI.app.loginUrl('https://vimeo.com/log_in', t('general.login.title'))
            }}>
              {t('settings.auth.login.vimeo')}
            </button>
          </div>
        </div>
      </div>

      {/* Setup Instructions */}
      <div className="card">
        <div className="card-header" onClick={() => setSetupExpanded(!setupExpanded)}>
          <span style={{ fontSize: 10 }}>{setupExpanded ? '▼' : '▶'}</span>
          {t('settings.setup.instructions')}
        </div>
        {setupExpanded && (
          <div className="card-body" style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <div>{t('settings.setup.step1')}</div>
            <div>{t('settings.setup.step2')}</div>
            <div>{t('settings.setup.step3')}</div>
            <div>{t('settings.setup.step4')}</div>
          </div>
        )}
      </div>
    </div>
  )
}