import { useTranslation } from 'react-i18next'

interface Props {
  progress: number
  status: string
  filePath: string
}

export default function ProgressCell({ progress, status, filePath }: Props) {
  const { t } = useTranslation()
  const pct = Math.round(progress * 100)

  if (status === 'ERROR') {
    return <span style={{ color: '#F44336', fontSize: 13, fontWeight: 500 }}>{t('status.failed.label')}</span>
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 12, background: '#e0e0e0', borderRadius: 3, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            borderRadius: 3,
            background: status === 'COMPLETED' ? '#4CAF50' : '#2196F3',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      <span style={{
        fontSize: 12,
        fontWeight: 500,
        color: status === 'COMPLETED' ? '#4CAF50' : '#333',
        minWidth: 36,
        textAlign: 'right' as const,
      }}>
        {pct}%
      </span>
      {status === 'COMPLETED' && filePath && (
        <button
          style={{ fontSize: 12, background: 'none', padding: '0 4px', color: '#2196F3', cursor: 'pointer', border: 'none' }}
          onClick={() => window.electronAPI.app.openPath(filePath)}
          title={filePath}
        >
          &gt;
        </button>
      )}
    </div>
  )
}