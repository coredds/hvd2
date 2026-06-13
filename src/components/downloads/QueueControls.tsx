import { useTranslation } from 'react-i18next'

interface Props {
  onStartAll: () => void
  onPauseAll: () => void
  onRemoveSelected: () => void
  hasDownloads: boolean
}

export default function QueueControls({ onStartAll, onPauseAll, onRemoveSelected, hasDownloads }: Props) {
  const { t } = useTranslation()

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <button className="btn-success" onClick={onStartAll} disabled={!hasDownloads}>
        {t('downloads.start.all')}
      </button>
      <button className="btn-warning" onClick={onPauseAll} disabled={!hasDownloads}>
        {t('downloads.pause.all')}
      </button>
      <button className="btn-danger" onClick={onRemoveSelected} disabled={!hasDownloads}>
        {t('downloads.remove.selected')}
      </button>
    </div>
  )
}