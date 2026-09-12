import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { DownloadItem } from '../../types'
import { getErrorPresentation } from '../../lib/errorPresentation'
import { getBrowserLabel } from '../../lib/authProviders'
import { useSettingsStore } from '../../stores/settingsStore'

interface Props {
  item: DownloadItem
  onRetry: (item: DownloadItem) => void
  onSignIn: (item: DownloadItem) => void
}

export default function ErrorCell({ item, onRetry, onSignIn }: Props) {
  const { t } = useTranslation()
  const [showDetails, setShowDetails] = useState(false)
  const source = useSettingsStore((s) => s.prefs['browser.cookies.source'])
  const presentation = getErrorPresentation(item.errorKind, item.cookiesFailed, item.url)
  const message = t(presentation.messageKey).replace('{0}', getBrowserLabel(source))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ color: '#F44336', fontWeight: 500, fontSize: 12 }} title={item.errorMessage}>
        {message}
      </span>
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn-default" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => onRetry(item)}>
          {t('downloads.error.retry')}
        </button>
        {presentation.showSignIn && (
          <button className="btn-primary" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => onSignIn(item)}>
            {t('downloads.error.signin')}
          </button>
        )}
        <button className="btn-default" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => setShowDetails((v) => !v)}>
          {t('downloads.error.details')}
        </button>
      </div>
      {showDetails && (
        <pre style={{ fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0, color: 'var(--text-dim)' }}>
          {item.errorMessage}
        </pre>
      )}
    </div>
  )
}
