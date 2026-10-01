import { describe, expect, it, vi } from 'vitest'
import { startAppInitialization } from '../src/lib/appInitialization'
import { DEFAULT_PREFERENCES } from '../src/types'

function setup() {
  const api = {
    prefs: { getAll: vi.fn().mockResolvedValue({ ...DEFAULT_PREFERENCES, 'app.language': 'Japanese' }) },
    deps: {
      checkYtDlp: vi.fn().mockResolvedValue({ available: true, isRecent: true, version: '2026.09.30' }),
      checkFFmpeg: vi.fn().mockResolvedValue(true),
      checkDeno: vi.fn().mockResolvedValue(true),
    },
  }
  const callbacks = {
    appendLog: vi.fn(), setPrefs: vi.fn(), setYtDlpStatus: vi.fn(),
    setFFmpegStatus: vi.fn(), setDenoStatus: vi.fn(), onChecked: vi.fn(),
  }
  const applyLanguage = vi.fn().mockResolvedValue(undefined)
  return { api, callbacks, applyLanguage }
}

async function flush() { await new Promise<void>((resolve) => setImmediate(resolve)) }

describe('application initialization lifecycle', () => {
  it('loads preferences and language before checking dependencies once', async () => {
    const { api, callbacks, applyLanguage } = setup()
    startAppInitialization(api, callbacks, applyLanguage)
    await flush()
    expect(callbacks.setPrefs).toHaveBeenCalledWith(expect.objectContaining({ 'app.language': 'Japanese' }))
    expect(applyLanguage).toHaveBeenCalledExactlyOnceWith('Japanese')
    expect(api.deps.checkYtDlp).toHaveBeenCalledTimes(1)
    expect(applyLanguage.mock.invocationCallOrder[0]).toBeLessThan(api.deps.checkYtDlp.mock.invocationCallOrder[0])
    expect(callbacks.setYtDlpStatus).toHaveBeenCalledExactlyOnceWith('available', '2026.09.30')
    expect(callbacks.onChecked).toHaveBeenCalledTimes(1)
  })

  it('uses defaults if preferences or language initialization fails', async () => {
    const { api, callbacks, applyLanguage } = setup()
    api.prefs.getAll.mockRejectedValue(new Error('unavailable'))
    applyLanguage.mockRejectedValue(new Error('no locale'))
    startAppInitialization(api, callbacks, applyLanguage)
    await flush()
    expect(callbacks.setPrefs).toHaveBeenCalledWith(DEFAULT_PREFERENCES)
    expect(applyLanguage).toHaveBeenCalledWith('auto')
    expect(callbacks.onChecked).toHaveBeenCalledTimes(1)
  })

  it('records missing dependencies without aborting other checks', async () => {
    const { api, callbacks, applyLanguage } = setup()
    api.deps.checkYtDlp.mockRejectedValue(new Error('missing'))
    api.deps.checkFFmpeg.mockRejectedValue(new Error('missing'))
    api.deps.checkDeno.mockResolvedValue(false)
    startAppInitialization(api, callbacks, applyLanguage)
    await flush()
    expect(callbacks.setYtDlpStatus).toHaveBeenCalledWith('not-found')
    expect(callbacks.setFFmpegStatus).toHaveBeenCalledWith('not-found')
    expect(callbacks.setDenoStatus).toHaveBeenCalledWith('not-found')
    expect(callbacks.appendLog.mock.calls.at(-1)?.[0]).toContain('yt-dlp, FFmpeg, Deno')
    expect(callbacks.onChecked).toHaveBeenCalledTimes(1)
  })

  it('does not apply late preferences after cleanup', async () => {
    const { api, callbacks, applyLanguage } = setup()
    let resolve!: (value: typeof DEFAULT_PREFERENCES) => void
    api.prefs.getAll.mockReturnValue(new Promise((done) => { resolve = done }))
    const cleanup = startAppInitialization(api, callbacks, applyLanguage)
    cleanup()
    resolve(DEFAULT_PREFERENCES)
    await flush()
    expect(callbacks.setPrefs).not.toHaveBeenCalled()
    expect(applyLanguage).not.toHaveBeenCalled()
    expect(api.deps.checkYtDlp).not.toHaveBeenCalled()
  })

  it('does not update status or run more checks after cleanup during a dependency check', async () => {
    const { api, callbacks, applyLanguage } = setup()
    let resolve!: (value: { available: boolean; isRecent: boolean; version: string }) => void
    api.deps.checkYtDlp.mockReturnValue(new Promise((done) => { resolve = done }))
    const cleanup = startAppInitialization(api, callbacks, applyLanguage)
    await flush()
    cleanup()
    resolve({ available: true, isRecent: true, version: '2026.09.30' })
    await flush()
    expect(callbacks.setYtDlpStatus).not.toHaveBeenCalled()
    expect(api.deps.checkFFmpeg).not.toHaveBeenCalled()
    expect(callbacks.onChecked).not.toHaveBeenCalled()
  })
})
