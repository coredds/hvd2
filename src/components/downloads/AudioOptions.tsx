import { useTranslation } from 'react-i18next'
import FolderPicker from '../common/FolderPicker'

interface Props {
  audioFormat: string
  audioQuality: string
  audioOutputDir: string
  embedThumbnail: boolean
  addMetadata: boolean
  onAudioFormatChange: (val: string) => void
  onAudioQualityChange: (val: string) => void
  onAudioOutputDirChange: (val: string) => void
  onEmbedThumbnailChange: (val: boolean) => void
  onAddMetadataChange: (val: boolean) => void
}

export default function AudioOptions({
  audioFormat, audioQuality, audioOutputDir,
  embedThumbnail, addMetadata,
  onAudioFormatChange, onAudioQualityChange,
  onAudioOutputDirChange, onEmbedThumbnailChange, onAddMetadataChange,
}: Props) {
  const { t } = useTranslation()

  const audioFormats = ['mp3', 'aac', 'm4a', 'opus', 'flac', 'wav']
  const audioQualities = ['320k', '256k', '192k', '128k', '96k', '64k']

  const selectStyle: React.CSSProperties = {
    border: '1px solid var(--border-input)',
    borderRadius: 4,
    padding: '4px 8px',
    fontSize: 13,
    minWidth: 100,
    background: 'var(--bg-input)',
    color: 'var(--text-primary)',
  }

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    color: 'var(--text-secondary)',
    whiteSpace: 'nowrap' as const,
    fontWeight: 500,
  }

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 14 }}>
        <div style={rowStyle}>
          <span style={labelStyle}>{t('downloads.audio.format.label')}</span>
          <select style={selectStyle} value={audioFormat} onChange={(e) => onAudioFormatChange(e.target.value)}>
            {audioFormats.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>

        <div style={rowStyle}>
          <span style={labelStyle}>{t('downloads.audio.quality.label')}</span>
          <select style={selectStyle} value={audioQuality} onChange={(e) => onAudioQualityChange(e.target.value)}>
            {audioQualities.map((q) => (
              <option key={q} value={q}>{q}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <FolderPicker
          labelKey="downloads.audio.output.directory.label"
          value={audioOutputDir}
          onChange={onAudioOutputDirChange}
        />
      </div>

      <div>
        <div className="section-title">{t('downloads.audio.options.label')}</div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#555', cursor: 'pointer' }}>
            <input type="checkbox" checked={embedThumbnail} onChange={(e) => onEmbedThumbnailChange(e.target.checked)} />
            {t('downloads.embed.thumbnail')}
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#555', cursor: 'pointer' }}>
            <input type="checkbox" checked={addMetadata} onChange={(e) => onAddMetadataChange(e.target.checked)} />
            {t('downloads.add.metadata')}
          </label>
        </div>
      </div>
    </div>
  )
}