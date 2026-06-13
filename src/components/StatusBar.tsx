import { useTranslation } from 'react-i18next'

interface Props {
  messageKey: string
  showSpinner: boolean
}

export default function StatusBar({ messageKey, showSpinner }: Props) {
  const { t } = useTranslation()

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '4px 12px',
      borderTop: '1px solid var(--border-statusbar)',
      background: 'var(--bg-statusbar)',
      fontSize: 12,
      color: 'var(--text-muted)',
      userSelect: 'none',
      flexShrink: 0,
      minHeight: 24,
    }}>
      <span>{t(messageKey)}</span>
      {showSpinner && (
        <div style={{
          width: 12,
          height: 12,
          border: '2px solid #2196F3',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
      )}
    </div>
  )
}