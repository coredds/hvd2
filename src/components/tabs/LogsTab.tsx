import { useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLogStore } from '../../stores/logStore'

export default function LogsTab() {
  const { t } = useTranslation()
  const lines = useLogStore((s) => s.lines)
  const clearLogs = useLogStore((s) => s.clearLogs)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [lines])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div className="section-title" style={{ marginBottom: 0 }}>{t('logs.label')}</div>
        <button className="btn-default" onClick={clearLogs}>
          {t('logs.clear')}
        </button>
      </div>
      <div
        ref={scrollRef}
        className="card"
        style={{ height: 400, overflow: 'auto', padding: 10 }}
      >
        <pre style={{
          fontSize: 12,
          fontFamily: 'Consolas, "Cascadia Code", monospace',
          color: 'var(--text-primary)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          margin: 0,
          lineHeight: 1.5,
        }}>
          {lines.length === 0 ? (
            <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>{t('alert.no.logs')}</span>
          ) : (
            lines.join('\n')
          )}
        </pre>
      </div>
    </div>
  )
}