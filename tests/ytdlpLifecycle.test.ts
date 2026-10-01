import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import type { ChildProcess } from 'node:child_process'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { YtDlpService } from '../electron/services/YtDlpService'
import type { DownloadItem, DownloadOptions } from '../electron/services/CommandBuilder'

const mocks = vi.hoisted(() => ({ spawn: vi.fn(), send: vi.fn(), hasWindow: true, localDeno: false }))
vi.mock('child_process', () => ({ spawn: mocks.spawn }))
vi.mock('electron', () => ({
  BrowserWindow: { getAllWindows: () => mocks.hasWindow ? [{ isDestroyed: () => false, webContents: { send: mocks.send } }] : [] },
}))
vi.mock('../electron/services/DependencyManager', () => ({
  DependencyManager: class {
    isYtDlpAvailableLocally() { return false }
    isDenoAvailableLocally() { return mocks.localDeno }
    getLocalFFmpegPath() { return '/hvd/bin/ffmpeg' }
    getLocalDenoPath() { return '/hvd/bin/deno' }
  },
}))

class FakeChild extends EventEmitter {
  stdout = new PassThrough()
  stderr = new PassThrough()
  killed = false
  kill = vi.fn(() => { this.killed = true; return true })
  asChild(): ChildProcess { return this as unknown as ChildProcess }
}

const item: DownloadItem = { id: 'download-1', url: 'https://example.com/video', title: 'video', noPlaylist: true }
const options: DownloadOptions = {
  audioOnly: false, audioFormat: 'mp3', audioQuality: '192k', videoQuality: '1080p',
  videoFormat: 'mp4', videoAudioFormat: 'aac', outputDirectory: '/downloads',
  embedSubtitles: false, embedThumbnail: false, addMetadata: false,
  useBrowserCookies: true, browserSource: 'chrome',
}

describe('yt-dlp process lifecycle', () => {
  let children: FakeChild[]
  let service: YtDlpService
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.hasWindow = true
    mocks.localDeno = false
    children = []
    mocks.spawn.mockImplementation(() => {
      const child = new FakeChild()
      children.push(child)
      return child.asChild()
    })
    service = new YtDlpService()
  })

  it('waits for termination and reports a pause exactly once without an error', async () => {
    service.startDownload(item, options)
    let finished = false
    const paused = Promise.resolve(service.cancelDownload(item.id)).then(() => { finished = true })
    await Promise.resolve()
    expect(finished).toBe(false)
    expect(mocks.send).not.toHaveBeenCalledWith('download:paused', expect.anything())
    children[0].emit('close', null)
    await paused
    expect(mocks.send.mock.calls).toEqual([['download:paused', { id: item.id }]])
    children[0].emit('close', null)
    expect(mocks.send).toHaveBeenCalledTimes(1)
  })

  it('does not retry cookies or emit progress after intentional termination', async () => {
    service.startDownload(item, options)
    const paused = service.cancelDownload(item.id)
    children[0].stdout.write('[download] 42.0%\n')
    children[0].stderr.write('ERROR: Could not copy Chrome cookie database')
    children[0].emit('close', 1)
    await paused
    expect(children).toHaveLength(1)
    expect(mocks.send.mock.calls).toEqual([['download:paused', { id: item.id }]])
  })

  it('suppresses successful completion when pause races a zero exit code', async () => {
    service.startDownload(item, options)
    const paused = service.cancelDownload(item.id)
    children[0].emit('close', 0)
    await paused
    expect(mocks.send.mock.calls).toEqual([['download:paused', { id: item.id }]])
  })

  it('keeps an unkillable download tracked and reports cancellation failure', async () => {
    service.startDownload(item, options)
    children[0].kill.mockReturnValue(false)
    await expect(service.cancelDownload(item.id)).rejects.toThrow('stop')
    service.startDownload(item, options)
    expect(children).toHaveLength(1)
    children[0].emit('close', 0)
    expect(mocks.send).toHaveBeenCalledWith('download:complete', expect.anything())
  })

  it('deduplicates active starts and permits restart only after close', async () => {
    const first = service.startDownload(item, options)
    expect(service.startDownload(item, options)).toBe(first)
    expect(children).toHaveLength(1)
    const paused = service.cancelDownload(item.id)
    children[0].emit('close', null)
    await paused
    service.startDownload(item, options)
    expect(children).toHaveLength(2)
    children[0].stdout.write('[download] 10.0%\n')
    children[0].emit('error', new Error('late'))
    children[0].emit('close', 1)
    expect(mocks.send.mock.calls).toEqual([['download:paused', { id: item.id }]])
    expect(service.startDownload(item, options)).toBe(children[1].asChild())
  })

  it('reports a spawn error once even when followed by close', () => {
    service.startDownload(item, options)
    children[0].emit('error', new Error('ENOENT'))
    children[0].emit('close', -2)
    expect(mocks.send.mock.calls.filter(([channel]) => channel === 'download:error')).toHaveLength(1)
  })

  it('retains the normal single cookie fallback', () => {
    service.startDownload(item, options)
    children[0].stderr.write('ERROR: Could not copy Chrome cookie database')
    children[0].emit('close', 1)
    expect(children).toHaveLength(2)
    expect(mocks.spawn.mock.calls[1][1]).not.toContain('--cookies-from-browser')
    children[1].stderr.write('ERROR: Sign in to confirm your age')
    children[1].emit('close', 1)
    expect(children).toHaveLength(2)
    expect(mocks.send).toHaveBeenCalledWith('download:error', expect.objectContaining({ cookiesFailed: true }))
  })

  it('suppresses late callbacks and fallback during shutdown', () => {
    service.startDownload(item, options)
    service.cancelAll()
    children[0].stderr.write('ERROR: Could not copy Chrome cookie database')
    children[0].stdout.write('[download] 42.0%\n')
    children[0].emit('close', 1)
    expect(children).toHaveLength(1)
    expect(mocks.send).not.toHaveBeenCalled()
  })

  it('still installs lifecycle handlers when no window exists', () => {
    mocks.hasWindow = false
    service.startDownload(item, options)
    children[0].emit('error', new Error('ENOENT'))
    children[0].emit('close', -2)
    service.startDownload(item, options)
    expect(children).toHaveLength(2)
  })

  it('sends completed paths parsed from downloader output', async () => {
    service.startDownload(item, options)
    children[0].stdout.write('[Merger] Merging formats into "/downloads/video.mp4"\n')
    children[0].emit('close', 0)
    await Promise.resolve()
    expect(mocks.send).toHaveBeenCalledWith('download:complete', { id: item.id, filePath: '/downloads/video.mp4' })
  })

  it('reports the final converted audio path after post-processing and moving', () => {
    service.startDownload(item, { ...options, audioOnly: true })
    children[0].stdout.write('[download] Destination: /downloads/audio.webm\n')
    children[0].stdout.write('[ExtractAudio] Destination: /downloads/audio.mp3\n')
    children[0].stdout.write('HVD_FINAL_PATH:"/downloads/audio.mp3"\n')
    children[0].emit('close', 0)
    expect(mocks.send).toHaveBeenCalledWith('download:complete', { id: item.id, filePath: '/downloads/audio.mp3' })
    expect(mocks.send).not.toHaveBeenCalledWith('download:status', { id: item.id, key: 'status.merging' })
  })

  it('supplies the installed Deno path for downloads, title extraction and cookie tests', async () => {
    mocks.localDeno = true
    service.startDownload(item, options)
    const title = service.extractTitle(item.url)
    const cookies = service.testBrowserCookies('chrome')
    children[0].emit('close', 0)
    children[1].stdout.write('Video title')
    children[1].emit('close', 0)
    children[2].emit('close', 0)
    await expect(title).resolves.toBe('Video title')
    await expect(cookies).resolves.toMatchObject({ ok: true })
    for (const [, args] of mocks.spawn.mock.calls) {
      expect(args).toContain('--js-runtimes')
      expect(args).toContain('deno:/hvd/bin/deno')
    }
  })

  it('retains system runtime fallback when local Deno is absent', () => {
    service.startDownload(item, options)
    expect(mocks.spawn.mock.calls[0][1]).not.toContain('--js-runtimes')
  })

  it('forces UTF-8 output for extraction commands and preserves Unicode titles', async () => {
    service.startDownload(item, options)
    const title = service.extractTitle(item.url)
    const cookies = service.testBrowserCookies('chrome')
    children[0].emit('close', 0)
    children[1].stdout.write(Buffer.from('Google’s model — 日本語\n', 'utf8'))
    children[1].emit('close', 0)
    children[2].emit('close', 0)
    await expect(title).resolves.toBe('Google’s model — 日本語')
    await cookies
    for (const [, args] of mocks.spawn.mock.calls) {
      expect(args[args.indexOf('--encoding') + 1]).toBe('utf-8')
    }
  })

  it('keeps version checks and self-update compatible with older yt-dlp versions', async () => {
    mocks.localDeno = true
    const version = service.getVersion()
    const updated = service.updateSelf()
    expect(mocks.spawn.mock.calls[0][1]).toEqual(['--version'])
    expect(mocks.spawn.mock.calls[1][1]).toEqual(['-U'])
    children[0].stdout.write('2026.09.30')
    children[0].emit('close', 0)
    children[1].emit('close', 0)
    await expect(version).resolves.toBe('2026.09.30')
    await expect(updated).resolves.toMatchObject({ success: true })
  })
})
