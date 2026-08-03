import { describe, it, expect } from 'vitest'
import { useDownloadStore } from '../src/stores/downloadStore'

describe('downloadStore', () => {
  it('remembers each item as audio-only or video', () => {
    const store = useDownloadStore.getState()
    // Cleared implicitly by test isolation; just add new items
    store.addUrls([
      { url: 'https://example.com/v1', noPlaylist: false, format: 'video-1080p', audioOnly: false },
      { url: 'https://example.com/a1', noPlaylist: false, format: 'audio-mp3', audioOnly: true },
    ])

    const items = useDownloadStore.getState().items
    expect(items).toHaveLength(2)
    expect(items[0].audioOnly).toBe(false)
    expect(items[1].audioOnly).toBe(true)
  })
})
