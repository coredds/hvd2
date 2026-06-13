import { useTranslation } from 'react-i18next'
import type { DownloadItem } from '../../types'
import ProgressCell from './ProgressCell'

interface Props {
  items: DownloadItem[]
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
}

const thStyle: React.CSSProperties = {
  padding: '6px 8px',
  textAlign: 'left' as const,
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text-secondary)',
  borderBottom: '1px solid var(--border-main)',
}

const tdStyle: React.CSSProperties = {
  padding: '5px 8px',
  fontSize: 13,
  borderBottom: '1px solid var(--border-table-row)',
}

export default function DownloadTable({ items, selectedIds, onToggleSelect }: Props) {
  const { t } = useTranslation()

  if (items.length === 0) {
    return (
      <div className="card" style={{ padding: '20px 12px', textAlign: 'center' }}>
        <span style={{ color: 'var(--text-dim)', fontStyle: 'italic', fontSize: 13 }}>No items in the download queue.</span>
      </div>
    )
  }

  const statusStyle = (status: string) => {
    switch (status) {
      case 'DOWNLOADING': return { color: '#2196F3', fontWeight: 600 }
      case 'COMPLETED': return { color: '#4CAF50', fontWeight: 600 }
      case 'ERROR': return { color: '#F44336', fontWeight: 600 }
      case 'PAUSED': return { color: '#FF9800', fontWeight: 600 }
      default: return { color: 'var(--text-muted)' }
    }
  }

  const allSelected = items.length > 0 && selectedIds.size === items.length

  return (
    <div style={{ border: '1px solid var(--border-main)', borderRadius: 4, background: 'var(--bg-surface)', overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: 'var(--bg-table-head)' }}>
            <th style={{ ...thStyle, width: 36 }}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => {
                  if (allSelected) {
                    items.forEach((i) => onToggleSelect(i.id))
                  } else {
                    items.forEach((i) => {
                      if (!selectedIds.has(i.id)) onToggleSelect(i.id)
                    })
                  }
                }}
              />
            </th>
            <th style={thStyle}>{t('table.url')}</th>
            <th style={thStyle}>{t('table.title')}</th>
            <th style={thStyle}>{t('table.format')}</th>
            <th style={{ ...thStyle, width: 100 }}>{t('table.status')}</th>
            <th style={{ ...thStyle, minWidth: 140 }}>{t('table.progress')}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              style={{
                background: selectedIds.has(item.id) ? 'var(--bg-selected)' : undefined,
              }}
            >
              <td style={{ ...tdStyle, textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(item.id)}
                  onChange={() => onToggleSelect(item.id)}
                />
              </td>
              <td style={{ ...tdStyle, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.url}>
                {item.url.length > 50 ? item.url.substring(0, 50) + '...' : item.url}
              </td>
              <td style={{ ...tdStyle, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.title}>
                {item.title}
              </td>
              <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{item.format}</td>
              <td style={tdStyle}>
                {item.status === 'ERROR' ? (
                  <span style={{ color: '#F44336', fontWeight: 500, fontSize: 12 }} title={item.errorMessage}>
                    {item.errorMessage || t(`status.${item.status.toLowerCase()}`)}
                  </span>
                ) : (
                  <span style={statusStyle(item.status)}>
                    {t(`status.${item.status.toLowerCase()}`)}
                  </span>
                )}
              </td>
              <td style={tdStyle}>
                <ProgressCell progress={item.progress} status={item.status} filePath={item.filePath} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}