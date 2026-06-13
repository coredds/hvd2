import { useTranslation } from 'react-i18next'
import FolderPicker from '../common/FolderPicker'

interface Props {
  videoQuality: string
  videoFormat: string
  videoAudioFormat: string
  videoOutputDir: string
  embedSubtitles: boolean
  embedThumbnail: boolean
  addMetadata: boolean
  onVideoQualityChange: (val: string) => void
  onVideoFormatChange: (val: string) => void
  onVideoAudioFormatChange: (val: string) => void
  onVideoOutputDirChange: (val: string) => void
  onEmbedSubtitlesChange: (val: boolean) => void
  onEmbedThumbnailChange: (val: boolean) => void
  onAddMetadataChange: (val: boolean) => void
}

export default function VideoOptions({
  videoQuality, videoFormat, videoAudioFormat, videoOutputDir,
  embedSubtitles, embedThumbnail, addMetadata,
  onVideoQualityChange, onVideoFormatChange, onVideoAudioFormatChange,
  onVideoOutputDirChange, onEmbedSubtitlesChange, onEmbedThumbnailChange, onAddMetadataChange,
}: Props) {
  const { t } = useTranslation()

  const videoQualities = [
    'quality.best', 'quality.4k', 'quality.1440p', 'quality.1080p',
    'quality.720p', 'quality.480p', 'quality.360p', 'quality.worst',
  ]

  const videoFormats = ['format.best', 'mp4', 'webm', 'mkv', 'avi', 'mov']
  const audioFormats = ['aac', 'mp3', 'opus', 'm4a']

  const selectStyle: React.CSSProperties = {
    border: '1px solid var(--border-input)',
    borderRadius: 4,
    padding: '4px 8px',
    fontSize: 13,
    minWidth: 120,
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
          <span style={labelStyle}>{t('downloads.video.quality.label')}</span>
          <select style={selectStyle} value={videoQuality} onChange={(e) => onVideoQualityChange(e.target.value)}>
            {videoQualities.map((q) => (
              <option key={q} value={t(q)}>{t(q)}</option>
            ))}
          </select>
        </div>

        <div style={rowStyle}>
          <span style={labelStyle}>{t('downloads.video.format.label')}</span>
          <select style={selectStyle} value={videoFormat} onChange={(e) => onVideoFormatChange(e.target.value)}>
            {videoFormats.map((f) => (
              <option key={f} value={f === 'format.best' ? t(f) : f}>
                {f === 'format.best' ? t(f) : f}
              </option>
            ))}
          </select>
        </div>

        <div style={rowStyle}>
          <span style={labelStyle}>{t('downloads.video.audio.format.label')}</span>
          <select style={selectStyle} value={videoAudioFormat} onChange={(e) => onVideoAudioFormatChange(e.target.value)}>
            {audioFormats.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <FolderPicker
          labelKey="downloads.video.output.directory.label"
          value={videoOutputDir}
          onChange={onVideoOutputDirChange}
        />
      </div>

      <div>
        <div className="section-title">{t('downloads.video.options.label')}</div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#555', cursor: 'pointer' }}>
            <input type="checkbox" checked={embedSubtitles} onChange={(e) => onEmbedSubtitlesChange(e.target.checked)} />
            {t('downloads.embed.subtitles')}
          </label>
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