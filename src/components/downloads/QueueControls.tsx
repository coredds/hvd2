import { useTranslation } from 'react-i18next'

interface Props {
  onStartAll: () => void
  onPauseAll: () => void
  onRemoveSelected: () => void
  onRetryFailed: () => void
  hasDownloads: boolean
  hasErrors: boolean
}

export default function QueueControls({ onStartAll, onPauseAll, onRemoveSelected, onRetryFailed, hasDownloads, hasErrors }: Props) {
  const { t } = useTranslation()

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <button className="btn-success" onClick={onStartAll} disabled={!hasDownloads}>
        {t('downloads.start.all')}
      </button>
      <button className="btn-warning" onClick={onPauseAll} disabled={!hasDownloads}>
        {t('downloads.pause.all')}
      </button>
      <button className="btn-primary" onClick={onRetryFailed} disabled={!hasErrors}>
        {t('downloads.retry.failed')}
      </button>
      <button className="btn-danger" onClick={onRemoveSelected} disabled={!hasDownloads}>
        {t('downloads.remove.selected')}
      </button>
    </div>
  )
}
