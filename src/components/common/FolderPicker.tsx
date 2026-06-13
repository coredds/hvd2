import { useTranslation } from 'react-i18next'

interface FolderPickerProps {
  labelKey?: string
  value: string
  onChange: (path: string) => void
}

export default function FolderPicker({ labelKey = 'downloads.output.directory.label', value, onChange }: FolderPickerProps) {
  const { t } = useTranslation()

  const handleBrowse = async () => {
    console.log('[FolderPicker] browse clicked, api exists:', !!window.electronAPI)
    const folder = await window.electronAPI.dialog.openFolder()
    console.log('[FolderPicker] selected folder:', folder)
    if (folder) onChange(folder)
  }

  return (
    <div>
      <div className="form-label">{t(labelKey)}</div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ flex: 1 }}
        />
        <button className="btn-default" onClick={handleBrowse}>
          {t('button.browse')}
        </button>
      </div>
    </div>
  )
}