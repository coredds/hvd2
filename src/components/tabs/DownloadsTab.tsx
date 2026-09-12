import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import UrlInput from '../downloads/UrlInput'
import VideoOptions from '../downloads/VideoOptions'
import AudioOptions from '../downloads/AudioOptions'
import DownloadTable from '../downloads/DownloadTable'
import QueueControls from '../downloads/QueueControls'
import { useDownloadStore } from '../../stores/downloadStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { useLogStore } from '../../stores/logStore'
import { buildDownloadOptionsForItem } from '../../lib/buildDownloadOptions'

interface Props {
  setStatusMessage: (key: string) => void
  setStatusSpinner: (show: boolean) => void
}

function isPlaylistUrl(url: string): boolean {
  return /list=/.test(url) || /playlist\?/.test(url) ||
    /youtube\.com\/playlist/.test(url) ||
    /youtu\.be\/.*\?.*list=/.test(url)
}

export default function DownloadsTab({ setStatusMessage, setStatusSpinner }: Props) {
  const { t } = useTranslation()
  const items = useDownloadStore((s) => s.items)
  const addUrls = useDownloadStore((s) => s.addUrls)
  const removeItems = useDownloadStore((s) => s.removeItems)
  const updateProgress = useDownloadStore((s) => s.updateProgress)
  const updateStatus = useDownloadStore((s) => s.updateStatus)
  const setTitle = useDownloadStore((s) => s.setTitle)
  const setError = useDownloadStore((s) => s.setError)
  const appendLog = useLogStore((s) => s.appendLog)

  const prefs = useSettingsStore((s) => s.prefs)
  const ytDlpStatus = useSettingsStore((s) => s.ytDlpStatus)
  const setYtDlpStatus = useSettingsStore((s) => s.setYtDlpStatus)

  const [urlText, setUrlText] = useState('')
  const [activeSubtab, setActiveSubtab] = useState<'video' | 'audio'>(
    prefs['download.type.audio'] ? 'audio' : 'video'
  )
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [optionsExpanded, setOptionsExpanded] = useState(true)

  const [videoQuality, setVideoQuality] = useState(prefs['video.quality'])
  const [videoFormat, setVideoFormat] = useState(prefs['video.format'])
  const [videoAudioFormat, setVideoAudioFormat] = useState(prefs['video.audio.format'])
  const [audioFormat, setAudioFormat] = useState(prefs['audio.format'])
  const [audioQuality, setAudioQuality] = useState(prefs['audio.quality'])
  const [videoOutputDir, setVideoOutputDir] = useState(prefs['video.output.directory'])
  const [audioOutputDir, setAudioOutputDir] = useState(prefs['audio.output.directory'])
  const [embedSubtitles, setEmbedSubtitles] = useState(prefs['embed.subtitles'])
  const [embedThumbnailV, setEmbedThumbnailV] = useState(prefs['embed.thumbnail'])
  const [addMetadataV, setAddMetadataV] = useState(prefs['add.metadata'])
  const [embedThumbnailA, setEmbedThumbnailA] = useState(prefs['embed.thumbnail.audio'])
  const [addMetadataA, setAddMetadataA] = useState(prefs['add.metadata.audio'])

  // Sync local state when saved prefs are loaded on startup
  useEffect(() => {
    if (prefs['video.output.directory']) setVideoOutputDir(prefs['video.output.directory'])
    if (prefs['audio.output.directory']) setAudioOutputDir(prefs['audio.output.directory'])
  }, [prefs['video.output.directory'], prefs['audio.output.directory']])

  const buildCurrentOptionsParams = useCallback(() => ({
    audioFormat,
    audioQuality,
    videoQuality,
    videoFormat,
    videoAudioFormat,
    audioOutputDir,
    videoOutputDir,
    embedSubtitles,
    embedThumbnailV,
    embedThumbnailA,
    addMetadataV,
    addMetadataA,
    useBrowserCookies: prefs['browser.cookies.enabled'],
    browserSource: prefs['browser.cookies.source'],
  }), [
    audioFormat, audioQuality, videoQuality, videoFormat, videoAudioFormat,
    audioOutputDir, videoOutputDir, embedSubtitles, embedThumbnailV, embedThumbnailA,
    addMetadataV, addMetadataA, prefs['browser.cookies.enabled'], prefs['browser.cookies.source'],
  ])

  useEffect(() => {
    const api = window.electronAPI
    if (!api) {
      console.error('[DownloadsTab] window.electronAPI is undefined!', window)
      return
    }
    console.log('[DownloadsTab] registering IPC listeners')

    // Check yt-dlp availability on mount
    api.deps.checkYtDlp().then((yt) => {
      if (yt.available) {
        setYtDlpStatus(yt.isRecent ? 'available' : 'outdated', yt.version)
      } else {
        setYtDlpStatus('not-found')
      }
    }).catch(() => setYtDlpStatus('not-found'))

    const onProgress = (_event: unknown, { id, progress }: { id: string; progress: number }) => {
      updateProgress(id, progress)
    }

    const onLog = (_event: unknown, { line }: { id: string; line: string }) => {
      appendLog(line)
    }

    const onStatus = (_event: unknown, { key }: { id: string; key: string }) => {
      setStatusMessage(key)
    }

    const onComplete = (_event: unknown, { id }: { id: string; filePath: string }) => {
      updateStatus(id, 'COMPLETED')
      setStatusMessage('status.download.completed')
      setStatusSpinner(false)
      setTimeout(() => setStatusMessage('status.ready'), 3000)
    }

    const onError = (_event: unknown, { id, message }: { id: string; message: string }) => {
      updateStatus(id, 'ERROR')
      setError(id, message, 'unknown', false)
      setStatusMessage('status.error')
      setStatusSpinner(false)
      appendLog(t('downloads.error.log').replace('{0}', message))

      // If auth error, log a tip
      if (/logged.in|cookies|403|Forbidden|authentication/i.test(message)) {
        const item = useDownloadStore.getState().items.find(i => i.id === id)
        if (item) {
          appendLog(t('downloads.error.auth.tip'))
        }
      }
    }

    const onPaused = (_event: unknown, { id }: { id: string }) => {
      updateStatus(id, 'PAUSED')
    }

    api.downloads.onProgress(onProgress)
    api.downloads.onLog(onLog)
    api.downloads.onStatus(onStatus)
    api.downloads.onComplete(onComplete)
    api.downloads.onError(onError)
    api.downloads.onPaused(onPaused)

    return () => {
      console.log('[DownloadsTab] removing IPC listeners')
      api.downloads.offProgress(onProgress)
      api.downloads.offLog(onLog)
      api.downloads.offStatus(onStatus)
      api.downloads.offComplete(onComplete)
      api.downloads.offError(onError)
      api.downloads.offPaused(onPaused)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addToQueue = async () => {
    const trimmed = urlText.trim()
    if (!trimmed) {
      await window.electronAPI.dialog.showAlert({
        title: t('alert.error'),
        message: t('alert.no.urls'),
      })
      return
    }

    // Check yt-dlp is available (only block if confirmed missing)
    if (ytDlpStatus === 'not-found') {
      await window.electronAPI.dialog.showAlert({
        title: t('alert.error'),
        message: t('status.ytdlp.not.found') + '\n\n' + t('settings.setup.step1'),
      })
      return
    }

    const urls = trimmed.split('\n').map((u) => u.trim()).filter(Boolean)
    let processed = 0
    let added = 0
    let skipped = 0

    for (const url of urls) {
      processed++

      const existing = items.find((i) => i.url === url)
      if (existing) {
        if (existing.status === 'COMPLETED') {
          appendLog(t('log.url.skipped.completed').replace('{0}', url))
        } else {
          appendLog(t('log.url.already.queued').replace('{0}', url).replace('{1}', t(`status.${existing.status.toLowerCase()}`)))
        }
        skipped++
        continue
      }

      let noPlaylist = false
      if (isPlaylistUrl(url)) {
        const result = await window.electronAPI.dialog.showAlert({
          title: t('alert.playlist.detected'),
          message: `${t('alert.playlist.header')}\n\n${t('alert.playlist.content')}`,
          type: 'question',
          buttons: [t('alert.playlist.single'), t('alert.playlist.entire'), t('alert.playlist.cancel')],
        })
        if (result === 0) {
          noPlaylist = true
          appendLog(t('log.playlist.single.chosen'))
        } else if (result === 1) {
          noPlaylist = false
          appendLog(t('log.playlist.entire.chosen'))
        } else {
          skipped++
          continue
        }
      }

      let formatStr: string
      if (activeSubtab === 'audio') {
        formatStr = `audio-${audioFormat}`
      } else {
        formatStr = `video-${videoQuality} (${videoFormat})`
      }

      addUrls([{ url, noPlaylist, format: formatStr, audioOnly: activeSubtab === 'audio' }])
      added++

      setStatusMessage('status.extracting.title')
      setStatusSpinner(true)
      const browser = prefs['browser.cookies.enabled'] ? prefs['browser.cookies.source'] : undefined
      window.electronAPI.downloads.extractTitle(url, browser).then((title) => {
        const itemInQueue = useDownloadStore.getState().items.find((i) => i.url === url)
        if (itemInQueue) setTitle(itemInQueue.id, title)
        setStatusMessage('status.ready')
        setStatusSpinner(false)
      }).catch(() => {
        setStatusMessage('status.ready')
        setStatusSpinner(false)
      })
    }

    if (skipped > 0) {
      appendLog(t('log.urls.processed').replace('{0}', String(processed)).replace('{1}', String(added)).replace('{2}', String(skipped)))
    } else {
      appendLog(t('log.items.added').replace('{0}', String(added)))
    }

    setUrlText('')
  }

  const startAll = async () => {
    const queued = items.filter((i) => i.status === 'QUEUED')
    if (queued.length === 0) {
      const allDone = items.filter((i) => i.status === 'COMPLETED' || i.status === 'DOWNLOADING')
      if (allDone.length > 0) {
        appendLog(t('log.downloads.none.started').replace('{0}', String(allDone.length)))
      } else {
        await window.electronAPI.dialog.showAlert({
          title: t('alert.information'),
          message: t('alert.no.items'),
        })
      }
      return
    }

    // Check yt-dlp is available (only block if confirmed missing)
    if (ytDlpStatus === 'not-found') {
      await window.electronAPI.dialog.showAlert({
        title: t('alert.error'),
        message: t('status.ytdlp.not.found') + '\n\n' + t('settings.setup.step1'),
      })
      return
    }

    const optionParams = buildCurrentOptionsParams()
    const hasThumbnail = queued.some((item) => buildDownloadOptionsForItem(item, optionParams).embedThumbnail)
    if (hasThumbnail) {
      const ffmpegOk = await window.electronAPI.deps.checkFFmpeg()
      if (!ffmpegOk) {
        const result = await window.electronAPI.dialog.showAlert({
          title: t('alert.ffmpeg.missing.title'),
          message: t('alert.ffmpeg.missing.content'),
          type: 'warning',
          buttons: [t('alert.continue'), t('alert.playlist.cancel')],
        })
        if (result !== 0) return
      }
    }

    let queuedCount = 0

    for (const item of queued) {
      updateStatus(item.id, 'DOWNLOADING')
      const options = buildDownloadOptionsForItem(item, optionParams)
      window.electronAPI.downloads.start(item, options)
      queuedCount++
    }

    const completedOrActive = items.filter((i) => i.status === 'COMPLETED' || i.status === 'DOWNLOADING').length - queuedCount
    if (completedOrActive > 0) {
      appendLog(t('log.downloads.started').replace('{0}', String(queuedCount)).replace('{1}', t('log.downloads.started.suffix').replace('{0}', String(completedOrActive))))
    } else {
      appendLog(t('log.downloads.started').replace('{0}', String(queuedCount)).replace('{1}', ''))
    }
  }

  const pauseAll = () => {
    let pausedCount = 0
    for (const item of items) {
      if (item.status === 'DOWNLOADING') {
        window.electronAPI.downloads.cancel(item.id)
        pausedCount++
      }
    }
    if (pausedCount > 0) {
      appendLog(t('log.downloads.paused').replace('{0}', String(pausedCount)))
    }
  }

  const removeSelected = () => {
    if (selectedIds.size === 0) return
    removeItems([...selectedIds])
    appendLog(t('log.items.removed').replace('{0}', String(selectedIds.size)))
    setSelectedIds(new Set())
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div>
      {/* URL Input */}
      <UrlInput text={urlText} onChange={setUrlText} />
      <div style={{ marginTop: 10 }}>
        <button className="btn-primary" onClick={addToQueue}>
          {t('downloads.add.button')}
        </button>
      </div>

      {/* Download Options */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header" onClick={() => setOptionsExpanded(!optionsExpanded)}>
          <span style={{ fontSize: 10 }}>{optionsExpanded ? '▼' : '▶'}</span>
          {t('downloads.options.title')}
        </div>
        {optionsExpanded && (
          <div className="card-body">
            {/* Sub-tab selector */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e0e0e0', marginBottom: 12 }}>
              <button
                onClick={() => setActiveSubtab('video')}
                className={`tab-btn${activeSubtab === 'video' ? ' active' : ''}`}
              >
                {t('downloads.type.video')}
              </button>
              <button
                onClick={() => setActiveSubtab('audio')}
                className={`tab-btn${activeSubtab === 'audio' ? ' active' : ''}`}
              >
                {t('downloads.type.audio')}
              </button>
            </div>

            {activeSubtab === 'video' ? (
              <VideoOptions
                videoQuality={videoQuality}
                videoFormat={videoFormat}
                videoAudioFormat={videoAudioFormat}
                videoOutputDir={videoOutputDir}
                embedSubtitles={embedSubtitles}
                embedThumbnail={embedThumbnailV}
                addMetadata={addMetadataV}
                onVideoQualityChange={setVideoQuality}
                onVideoFormatChange={setVideoFormat}
                onVideoAudioFormatChange={setVideoAudioFormat}
                onVideoOutputDirChange={(path) => { setVideoOutputDir(path); window.electronAPI.prefs.set('video.output.directory', path).catch(() => {}) }}
                onEmbedSubtitlesChange={setEmbedSubtitles}
                onEmbedThumbnailChange={setEmbedThumbnailV}
                onAddMetadataChange={setAddMetadataV}
              />
            ) : (
              <AudioOptions
                audioFormat={audioFormat}
                audioQuality={audioQuality}
                audioOutputDir={audioOutputDir}
                embedThumbnail={embedThumbnailA}
                addMetadata={addMetadataA}
                onAudioFormatChange={setAudioFormat}
                onAudioQualityChange={setAudioQuality}
                onAudioOutputDirChange={(path) => { setAudioOutputDir(path); window.electronAPI.prefs.set('audio.output.directory', path).catch(() => {}) }}
                onEmbedThumbnailChange={setEmbedThumbnailA}
                onAddMetadataChange={setAddMetadataA}
              />
            )}
          </div>
        )}
      </div>

      {/* Queue section */}
      <div style={{ marginTop: 20 }}>
        <div className="section-title">{t('downloads.queue.label')}</div>
        <QueueControls
          onStartAll={startAll}
          onPauseAll={pauseAll}
          onRemoveSelected={removeSelected}
          hasDownloads={items.length > 0}
        />
        <div style={{ marginTop: 8 }}>
          <DownloadTable items={items} selectedIds={selectedIds} onToggleSelect={toggleSelect} />
        </div>
      </div>
    </div>
  )
}