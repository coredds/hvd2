import { useTranslation } from 'react-i18next'
import type { DownloadItem } from '../../types'
import { getAuthProvider, getLoginUrl } from '../../lib/authProviders'

interface Props {
  items: DownloadItem[]
  source: string
  onOpenSettings: () => void
  onDismiss: () => void
}

export default function AuthBanner({ items, source, onOpenSettings, onDismiss }: Props) {
  const { t } = useTranslation()
  const provider = items.map((item) => getAuthProvider(item.url)).find((p) => p !== null) ?? null
  if (!provider) return null

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      border: '1px solid var(--border-main)', background: 'var(--bg-surface-alt)',
      borderRadius: 4, padding: '8px 12px', marginBottom: 10,
    }}>
      <span style={{ flex: 1, fontSize: 12, color: 'var(--text-primary)' }}>{t('downloads.auth.banner')}</span>
      <button className="btn-primary" style={{ fontSize: 11, padding: '4px 10px' }}
        onClick={() => window.electronAPI.app.openProvider(getLoginUrl(provider), source)}>
        {t('downloads.auth.banner.signin')}
      </button>
      <button className="btn-default" style={{ fontSize: 11, padding: '4px 10px' }} onClick={onOpenSettings}>
        {t('downloads.auth.banner.settings')}
      </button>
      <button className="btn-default" style={{ fontSize: 11, padding: '4px 10px' }} onClick={onDismiss}>
        {t('downloads.auth.banner.dismiss')}
      </button>
    </div>
  )
}
