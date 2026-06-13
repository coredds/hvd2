import { useTranslation } from 'react-i18next'

interface Props {
  text: string
  onChange: (value: string) => void
  placeholderKey?: string
}

export default function UrlInput({ text, onChange, placeholderKey }: Props) {
  const { t } = useTranslation()

  return (
    <div>
      <div className="form-label">{t('downloads.url.label')}</div>
      <textarea
        style={{
          width: '100%',
          boxSizing: 'border-box',
          border: '1px solid #ccc',
          borderRadius: 4,
          padding: '8px 10px',
          fontSize: 13,
          fontFamily: 'Consolas, "Cascadia Code", monospace',
          resize: 'vertical',
          outline: 'none',
          minHeight: 60,
        }}
        rows={3}
        value={text}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t(placeholderKey || 'downloads.url.prompt')}
        onFocus={(e) => { e.target.style.borderColor = '#2196F3'; e.target.style.boxShadow = '0 0 0 1px #2196F3' }}
        onBlur={(e) => { e.target.style.borderColor = '#ccc'; e.target.style.boxShadow = 'none' }}
      />
    </div>
  )
}