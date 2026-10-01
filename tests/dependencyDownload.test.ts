import { EventEmitter } from 'node:events'
import { PassThrough, Writable } from 'node:stream'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { downloadFile } from '../electron/services/downloadFile'

const mocks = vi.hoisted(() => ({ request: vi.fn(), createWriteStream: vi.fn() }))
vi.mock('https', () => ({ default: { request: mocks.request } }))
vi.mock('http', () => ({ default: { request: mocks.request } }))
vi.mock('fs', () => ({ default: { createWriteStream: mocks.createWriteStream } }))

class Response extends PassThrough {
  constructor(public statusCode = 200, public headers: Record<string, string> = {}) { super() }
}

describe('dependency download streams', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.createWriteStream.mockImplementation(() => new Writable({ write: (_chunk, _encoding, callback) => callback() }))
  })

  function respond(response: Response, body = 'data') {
    mocks.request.mockImplementationOnce((_url, _options, callback: (response: Response) => void) => {
      const request = new EventEmitter() as EventEmitter & { end: () => void }
      request.end = () => queueMicrotask(() => {
        callback(response)
        response.end(body)
      })
      return request
    })
  }

  it('waits for outstanding file writes after the HTTP response ends', async () => {
    let finishWrite!: () => void
    const file = new Writable({ write: (_chunk, _encoding, callback) => { finishWrite = callback } })
    mocks.createWriteStream.mockReturnValue(file)
    const response = new Response(200, { 'content-length': '4' })
    respond(response)
    let finished = false
    const pending = downloadFile('https://example.com/tool', '/tmp/tool').then(() => { finished = true })
    await new Promise<void>((resolve) => setImmediate(resolve))
    expect(response.readableEnded).toBe(true)
    expect(finished).toBe(false)
    finishWrite()
    await pending
    expect(file.writableFinished).toBe(true)
  })

  it('rejects file write failures and destroys the response stream', async () => {
    mocks.createWriteStream.mockReturnValue(new Writable({ write: (_chunk, _encoding, callback) => callback(new Error('disk full')) }))
    const response = new Response()
    respond(response)
    await expect(downloadFile('https://example.com/tool', '/tmp/tool')).rejects.toThrow('disk full')
    expect(response.destroyed).toBe(true)
  })

  it('rejects truncated responses', async () => {
    mocks.request.mockImplementationOnce((_url, _options, callback: (response: Response) => void) => {
      const request = new EventEmitter() as EventEmitter & { end: () => void }
      request.end = () => queueMicrotask(() => {
        const response = new Response()
        callback(response)
        response.destroy(new Error('connection lost'))
      })
      return request
    })
    await expect(downloadFile('https://example.com/tool', '/tmp/tool')).rejects.toThrow('connection lost')
  })

  it('follows relative redirects without writing their response bodies', async () => {
    respond(new Response(302, { location: '/download/tool' }), 'redirect')
    respond(new Response())
    await downloadFile('https://example.com/tool', '/tmp/tool')
    expect(mocks.request.mock.calls.map(([url]) => url)).toEqual(['https://example.com/tool', 'https://example.com/download/tool'])
    expect(mocks.createWriteStream).toHaveBeenCalledTimes(1)
    expect(mocks.request.mock.calls[0][1]).toMatchObject({ headers: { 'User-Agent': 'HVD-Video-Downloader/2' } })
  })

  it('rejects redirect loops rather than installing a redirect body', async () => {
    for (let index = 0; index < 6; index++) respond(new Response(302, { location: '/loop' }))
    await expect(downloadFile('https://example.com/loop', '/tmp/tool')).rejects.toThrow('redirect')
    expect(mocks.createWriteStream).not.toHaveBeenCalled()
  })

  it('rejects HTTP failures without opening the destination', async () => {
    respond(new Response(404))
    await expect(downloadFile('https://example.com/tool', '/tmp/tool')).rejects.toThrow('HTTP 404')
    expect(mocks.createWriteStream).not.toHaveBeenCalled()
  })

  it('reports progress from the streamed response', async () => {
    respond(new Response(200, { 'content-length': '4' }))
    const progress = vi.fn()
    await downloadFile('https://example.com/tool', '/tmp/tool', progress)
    expect(progress).toHaveBeenLastCalledWith(1)
  })
})
