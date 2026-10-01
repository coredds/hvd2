import fs from 'fs'
import http from 'http'
import https from 'https'
import { pipeline } from 'stream'

export function downloadFile(url: string, dest: string, onProgress?: (pct: number) => void): Promise<void> {
  const requestFile = (requestUrl: string, redirectsLeft: number): Promise<void> => new Promise((resolve, reject) => {
    const transport = requestUrl.startsWith('https:') ? https : http
    const request = transport.request(requestUrl, { headers: { 'User-Agent': 'HVD-Video-Downloader/2' } }, (response) => {
      const status = response.statusCode ?? 0
      if (status >= 300 && status < 400) {
        const location = response.headers.location
        response.resume()
        if (!location || redirectsLeft === 0) {
          reject(new Error(`Invalid or exhausted redirect for ${requestUrl}`))
          return
        }
        try {
          resolve(requestFile(new URL(location, requestUrl).href, redirectsLeft - 1))
        } catch (error) {
          reject(error)
        }
        return
      }
      if (status < 200 || status >= 400) {
        response.resume()
        reject(new Error(`HTTP ${status} for ${requestUrl}`))
        return
      }

      const total = Number(response.headers['content-length'] ?? 0)
      let downloaded = 0
      response.on('data', (chunk: Buffer) => {
        downloaded += chunk.length
        if (total > 0) onProgress?.(downloaded / total)
      })
      try {
        pipeline(response, fs.createWriteStream(dest), (error) => {
          if (error) reject(error)
          else resolve()
        })
      } catch (error) {
        response.destroy()
        reject(error)
      }
    })
    request.on('error', reject)
    request.end()
  })
  return requestFile(url, 5)
}
