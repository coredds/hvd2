import { describe, it, expect } from 'vitest'
import { useDownloadStore } from '../src/stores/downloadStore'

function reset() {
  useDownloadStore.getState().clearAll()
}

describe('downloadStore', () => {
  it('remembers each item as audio-only or video with error defaults', () => {
    reset()
    useDownloadStore.getState().addUrls([
      { url: 'https://example.com/v1', noPlaylist: false, format: 'video-1080p', audioOnly: false },
      { url: 'https://example.com/a1', noPlaylist: false, format: 'audio-mp3', audioOnly: true },
    ])
    const items = useDownloadStore.getState().items
    expect(items).toHaveLength(2)
    expect(items[0].audioOnly).toBe(false)
    expect(items[1].audioOnly).toBe(true)
    expect(items[0].errorKind).toBe('unknown')
    expect(items[0].cookiesFailed).toBe(false)
  })

  it('stores error details', () => {
    reset()
    const store = useDownloadStore.getState()
    store.addUrls([{ url: 'https://example.com/e1', noPlaylist: false, format: 'video', audioOnly: false }])
    const id = useDownloadStore.getState().items[0].id
    useDownloadStore.getState().setError(id, 'boom', 'auth', true)
    const item = useDownloadStore.getState().items[0]
    expect(item.errorMessage).toBe('boom')
    expect(item.errorKind).toBe('auth')
    expect(item.cookiesFailed).toBe(true)
    expect(item.status).toBe('QUEUED')
  })

  it('retries a single failed item', () => {
    reset()
    const store = useDownloadStore.getState()
    store.addUrls([{ url: 'https://example.com/r1', noPlaylist: false, format: 'video', audioOnly: false }])
    const id = useDownloadStore.getState().items[0].id
    useDownloadStore.getState().updateStatus(id, 'ERROR')
    useDownloadStore.getState().setError(id, 'boom', 'auth', true)
    useDownloadStore.getState().retryItem(id)
    const item = useDownloadStore.getState().items[0]
    expect(item.status).toBe('QUEUED')
    expect(item.errorMessage).toBe('')
    expect(item.errorKind).toBe('unknown')
    expect(item.cookiesFailed).toBe(false)
  })

  it('retries all failed items without touching others', () => {
    reset()
    useDownloadStore.getState().addUrls([
      { url: 'https://example.com/f1', noPlaylist: false, format: 'video', audioOnly: false },
      { url: 'https://example.com/f2', noPlaylist: false, format: 'video', audioOnly: false },
      { url: 'https://example.com/ok', noPlaylist: false, format: 'video', audioOnly: false },
    ])
    const items = useDownloadStore.getState().items
    useDownloadStore.getState().updateStatus(items[0].id, 'ERROR')
    useDownloadStore.getState().updateStatus(items[1].id, 'ERROR')
    useDownloadStore.getState().updateStatus(items[2].id, 'COMPLETED')
    useDownloadStore.getState().retryFailed()
    const after = useDownloadStore.getState().items
    expect(after[0].status).toBe('QUEUED')
    expect(after[1].status).toBe('QUEUED')
    expect(after[2].status).toBe('COMPLETED')
  })

  it('replaces an errored item when the same url is re-added', () => {
    reset()
    const url = 'https://example.com/dup'
    useDownloadStore.getState().addUrls([{ url, noPlaylist: false, format: 'video', audioOnly: false }])
    const id = useDownloadStore.getState().items[0].id
    useDownloadStore.getState().updateStatus(id, 'ERROR')
    useDownloadStore.getState().addUrls([{ url, noPlaylist: false, format: 'video', audioOnly: false }])
    const items = useDownloadStore.getState().items
    expect(items).toHaveLength(1)
    expect(items[0].id).not.toBe(id)
    expect(items[0].status).toBe('QUEUED')
  })
})
